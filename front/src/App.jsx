import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Box,
  Stack,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  IconButton,
} from "@mui/material";
import { Alert } from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
// import { styled } from "@mui/system";

function ItemsPopup({ apiId, items, onClose }) {
  const [open, setOpen] = useState(true);
  const theme = useTheme();

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const copyItemUrl = (itemId) => {
    navigator.clipboard.writeText(
      `http://localhost:3001/api/${apiId}/${itemId}`
    );
    onClose(`Copied item URL: ${itemId}`, "success");
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Items in API</DialogTitle>
      <DialogContent dividers>
        <List dense>
          {items.map((item) => (
            <ListItem
              key={item.id}
              secondaryAction={
                <IconButton
                  edge='end'
                  onClick={() => copyItemUrl(item.id)}
                  title='Copy item URL'
                >
                  <ContentCopy fontSize='small' />
                </IconButton>
              }
              disablePadding
            >
              <ListItemButton>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    pr: 2,
                  }}
                >
                  <Typography variant='body2'>
                    {item.name || `Item ${item.id}`}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    ID: {item.id}
                  </Typography>
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// کامپوننت MethodBadge با استفاده از تم
const MethodBadge = ({ method }) => {
  const theme = useTheme();

  const badgeStyle = {
    fontWeight: "bold",
    color:
      method === "GET"
        ? theme.palette.success.main
        : method === "POST"
        ? theme.palette.warning.main
        : method === "PUT"
        ? theme.palette.info.main
        : theme.palette.error.main,
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor:
      method === "GET"
        ? theme.palette.success.light
        : method === "POST"
        ? theme.palette.warning.light
        : method === "PUT"
        ? theme.palette.info.light
        : theme.palette.error.light,
    display: "inline-block",
  };

  return <span style={badgeStyle}>{method}</span>;
};

function App() {
  const theme = useTheme();
  const [endpoint, setEndpoint] = useState("");
  const [method, setMethod] = useState("GET");
  const [selectedApi, setSelectedApi] = useState(null);
  const [response, setResponse] = useState(
    JSON.stringify(
      [
        { id: 1, name: "Example 1", email: "example1@test.com" },
        { id: 2, name: "Example 2", email: "example2@test.com" },
        { id: 3, name: "Example 3", email: "example3@test.com" },
      ],
      null,
      2
    )
  );
  const [apis, setApis] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    fetchApis();
  }, []);

  const showItemsPopup = (api) => {
    const items = Array.isArray(api.response)
      ? api.response
      : api.response.mockData || [];
    setSelectedApi({ ...api, items });
  };

  const fetchApis = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/list");
      const data = await res.json();
      if (data.success) {
        setApis(data.apis);
      }
    } catch (error) {
      showSnackbar(`Failed to fetch APIs: ${error.message}`, "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const parsedResponse = JSON.parse(response);

      const res = await fetch("http://localhost:3001/api/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint,
          method,
          response: parsedResponse,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showSnackbar("API created successfully!", "success");
        setEndpoint("");
        setResponse(JSON.stringify([{ id: 1, name: "Example" }], null, 2));
        fetchApis();
      } else {
        showSnackbar(data.message || "Failed to create API", "error");
      }
    } catch (error) {
      showSnackbar(`Invalid JSON: ${error.message}`, "error");
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSnackbar("Copied to clipboard!", "success");
  };

  return (
    <Container
      maxWidth='lg'
      sx={{
        marginTop: theme.spacing(4),
        padding: theme.spacing(3),
      }}
    >
      <Typography variant='h4' component='h1' gutterBottom>
        Fake API Builder
      </Typography>
      <Paper
        elevation={3}
        sx={{
          padding: theme.spacing(3),
          marginBottom: theme.spacing(3),
        }}
      >
        <Box
          component='form'
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Stack direction='row' spacing={2} alignItems='center'>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              variant='outlined'
              size='medium'
              sx={{ minWidth: 120 }}
            >
              <MenuItem value='GET'>GET</MenuItem>
              <MenuItem value='POST'>POST</MenuItem>
              <MenuItem value='PUT'>PUT</MenuItem>
              <MenuItem value='DELETE'>DELETE</MenuItem>
            </Select>

            <TextField
              label='Endpoint'
              variant='outlined'
              fullWidth
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              required
              placeholder='/api/users'
              size='medium'
            />
          </Stack>

          <TextField
            label='Response JSON'
            variant='outlined'
            multiline
            minRows={8}
            maxRows={12}
            fullWidth
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            required
            helperText='Enter a valid JSON response'
          />

          <Button
            type='submit'
            variant='contained'
            color='primary'
            size='large'
            sx={{ alignSelf: "flex-start" }}
          >
            Create API
          </Button>
        </Box>
      </Paper>
      <Typography variant='h5' component='h2' gutterBottom>
        Your APIs
      </Typography>
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Method</TableCell>
              <TableCell>Endpoint</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apis.map((api) => (
              <TableRow key={api.id} hover>
                <TableCell>
                  <MethodBadge method={api.method} />
                </TableCell>
                <TableCell>{api.endpoint}</TableCell>
                <TableCell>
                  <Stack direction='row' spacing={1}>
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={() =>
                        copyToClipboard(`http://localhost:3001/api/${api.id}`)
                      }
                    >
                      Copy All
                    </Button>
                    <Button
                      variant='contained'
                      size='small'
                      onClick={() => showItemsPopup(api)}
                    >
                      View Items
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      {selectedApi && (
        <ItemsPopup
          apiId={selectedApi.id}
          items={selectedApi.items}
          onClose={(message, severity) => {
            setSelectedApi(null);
            if (message) showSnackbar(message, severity);
          }}
        />
      )}
    </Container>
  );
}

export default App;
