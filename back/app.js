const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// مسیر ذخیره APIها
const APIS_DIR = path.join(__dirname, "apis");

// ایجاد پوشه apis اگر وجود ندارد
if (!fs.existsSync(APIS_DIR)) {
  fs.mkdirSync(APIS_DIR);
}

// Route برای ایجاد API جدید
app.post("/api/create", (req, res) => {
  try {
    const { endpoint, method, response } = req.body;
    const apiId = uuidv4();

    const apiConfig = {
      id: apiId,
      endpoint,
      method: method.toUpperCase(),
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
      endpoint,
      method,
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
    const files = fs.readdirSync(APIS_DIR);
    const apis = files.map((file) => {
      const content = fs.readFileSync(path.join(APIS_DIR, file), "utf8");
      return JSON.parse(content);
    });

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
app.all("/api/:apiId/:itemId", (req, res) => {
  try {
    const { apiId, itemId } = req.params;
    const filePath = path.join(APIS_DIR, `${apiId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "API not found" });
    }

    const apiConfig = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // بررسی مطابقت متد
    if (req.method !== apiConfig.method) {
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed for this endpoint`,
      });
    }

    // پیدا کردن آیتم مورد نظر
    const items = Array.isArray(apiConfig.response)
      ? apiConfig.response
      : apiConfig.response.mockData || [];
    const item = items.find((i) => i.id == itemId); // استفاده از == برای تطبیق عددی/رشته‌ای

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
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

// Route داینامیک برای تمام APIهای ساخته شده
app.all("/api/:apiId", (req, res) => {
  try {
    const { apiId } = req.params;
    const filePath = path.join(APIS_DIR, `${apiId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "API not found",
      });
    }

    const apiConfig = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // بررسی مطابقت متد
    if (req.method !== apiConfig.method) {
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed for this endpoint`,
      });
    }

    // ارسال پاسخ
    res.json(apiConfig.response);
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
