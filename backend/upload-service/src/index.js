require("dotenv").config();

const logger = require("./utils/logger");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit =
  require("express-rate-limit");
const requestMiddleware =
  require("./middleware/request.middleware");
const errorMiddleware =
  require("./middleware/error.middleware");
const streamRoutes =
  require("./routes/stream.routes");
const uploadRoutes = require("./routes/upload.routes");
const videoRoutes =
  require("./routes/video.routes");
const websocketRoutes =
  require("./routes/websocket.routes");
const eventRoutes =
  require("./routes/events.routes");
const playbackRoutes =
  require("./routes/playback.routes");

const app = express();

app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests"
});


app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT"
    ]
  })
);

app.use(requestMiddleware);
app.use(helmet());
app.use(limiter);

app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "healthy"
  });
});

app.use("/websocket",websocketRoutes);
app.use("/upload", uploadRoutes);
app.use("/videos", videoRoutes);
app.use("/videos", playbackRoutes);
app.use("/stream", streamRoutes);
app.use("/events",eventRoutes);

app.use(errorMiddleware);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});