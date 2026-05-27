require("dotenv").config();

const express = require("express");
const cors = require("cors");

const uploadRoutes = require("./routes/upload.routes");

const videoRoutes =
  require("./routes/video.routes");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "healthy"
  });
});

app.use("/upload", uploadRoutes);
app.use("/videos", videoRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});