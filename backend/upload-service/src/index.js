require("dotenv").config();

const express = require("express");

const uploadRoutes = require("./routes/upload.routes");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "healthy"
  });
});

app.use("/upload", uploadRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});