const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3001;
const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "DELETE"]);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// مسیر ذخیره APIها
const APIS_DIR = path.join(__dirname, "apis");

// ایجاد پوشه apis اگر وجود ندارد
if (!fs.existsSync(APIS_DIR)) {
  fs.mkdirSync(APIS_DIR);
}

function readApiConfigs() {
  return fs
    .readdirSync(APIS_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(APIS_DIR, file), "utf8")));
}

// Route برای ایجاد API جدید
app.post("/api/create", (req, res) => {
  try {
    const { endpoint, method, response } = req.body || {};
    const normalizedEndpoint = typeof endpoint === "string" ? endpoint.trim() : "";
    const normalizedMethod = typeof method === "string" ? method.toUpperCase() : "";

    if (!/^\/api\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(normalizedEndpoint)) {
      return res.status(400).json({
        success: false,
        message: "Endpoint must start with /api/ and contain only path segments",
      });
    }

    if (!ALLOWED_METHODS.has(normalizedMethod)) {
      return res.status(400).json({
        success: false,
        message: "Method must be GET, POST, PUT, or DELETE",
      });
    }

    if (response === undefined) {
      return res.status(400).json({
        success: false,
        message: "A JSON response is required",
      });
    }

    const duplicate = readApiConfigs().some(
      (config) =>
        config.endpoint === normalizedEndpoint &&
        config.method === normalizedMethod
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "An API with this endpoint and method already exists",
      });
    }

    const apiId = uuidv4();
    const apiConfig = {
      id: apiId,
      endpoint: normalizedEndpoint,
      method: normalizedMethod,
      response,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(APIS_DIR, `${apiId}.json`),
      JSON.stringify(apiConfig, null, 2)
    );

    res.status(201).json({
      success: true,
      message: "API created successfully",
      apiId,
      endpoint: normalizedEndpoint,
      method: normalizedMethod,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create API",
      error: error.message,
    });
  }
});

// Route برای لیست تمام APIها
app.get("/api/list", (req, res) => {
  try {
    const apis = readApiConfigs();

    res.json({
      success: true,
      apis,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to list APIs",
      error: error.message,
    });
  }
});

// اضافه کردن endpoint برای آیتم‌های تکی
app.all("/api/:apiId/:itemId", (req, res, next) => {
  try {
    const { apiId, itemId } = req.params;
    const filePath = path.join(APIS_DIR, `${apiId}.json`);

    if (!fs.existsSync(filePath)) {
      return next();
    }

    const apiConfig = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (req.method !== apiConfig.method) {
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed for this endpoint`,
      });
    }

    const items = Array.isArray(apiConfig.response)
      ? apiConfig.response
      : Array.isArray(apiConfig.response.mockData)
      ? apiConfig.response.mockData
      : [];
    const item = items.find((entry) => String(entry.id) === itemId);

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to process request",
      error: error.message,
    });
  }
});

// Route داینامیک برای تمام APIهای ساخته شده با شناسه
app.all("/api/:apiId", (req, res, next) => {
  try {
    const { apiId } = req.params;
    const filePath = path.join(APIS_DIR, `${apiId}.json`);

    if (!fs.existsSync(filePath)) {
      return next();
    }

    const apiConfig = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (req.method !== apiConfig.method) {
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed for this endpoint`,
      });
    }

    res.json(apiConfig.response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to process API request",
      error: error.message,
    });
  }
});

// Route برای endpointهای سفارشی
app.use("/api", (req, res, next) => {
  try {
    const requestPath = req.originalUrl.split("?")[0];
    const apis = readApiConfigs();
    const apiConfig = apis.find((config) => config.endpoint === requestPath);

    if (apiConfig) {
      if (req.method !== apiConfig.method) {
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} not allowed for this endpoint`,
        });
      }

      return res.json(apiConfig.response);
    }

    const itemRoute = apis
      .map((config) => ({
        config,
        itemId: requestPath.startsWith(`${config.endpoint}/`)
          ? requestPath.slice(config.endpoint.length + 1)
          : "",
      }))
      .find(({ itemId }) => itemId && !itemId.includes("/"));

    if (!itemRoute) {
      return next();
    }

    const { config, itemId } = itemRoute;
    if (req.method !== config.method) {
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed for this endpoint`,
      });
    }

    const items = Array.isArray(config.response)
      ? config.response
      : Array.isArray(config.response.mockData)
      ? config.response.mockData
      : [];
    const item = items.find((entry) => String(entry.id) === itemId);

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.json(item);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to process API request",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
