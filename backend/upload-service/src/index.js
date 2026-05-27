require("dotenv").config();

const express = require("express");
const cors = require("cors");
const requestMiddleware =
  require("./middleware/request.middleware");
const errorMiddleware =
  require("./middleware/error.middleware");

const uploadRoutes = require("./routes/upload.routes");

const videoRoutes =
  require("./routes/video.routes");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  cors({
    origin: "*",

    methods: [
      "GET",
      "POST",
      "PUT"
    ]
  })
);

app.use(requestMiddleware);

app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "healthy"
  });
});

app.use("/upload", uploadRoutes);
app.use("/videos", videoRoutes);

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});