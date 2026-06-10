import "dotenv/config";
import logger from "./utils/logger.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import requestMiddleware from "./middleware/request.middleware.js";
import errorMiddleware from "./middleware/error.middleware.js";
import streamRoutes from "./routes/stream.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import videoRoutes from "./routes/video.routes.js";
import websocketRoutes from "./routes/websocket.routes.js";
import eventRoutes from "./routes/events.routes.js";
import playbackRoutes from "./routes/playback.routes.js";

const app = express();

app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, 
  message: "Too many requests",
});

app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT"],
  }),
);

app.use(requestMiddleware);
app.use(helmet());
app.use(limiter);

app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "healthy",
  });
});

app.use("/websocket", websocketRoutes);
app.use("/upload", uploadRoutes);
app.use("/videos", videoRoutes);
app.use("/videos", playbackRoutes);
app.use("/stream", streamRoutes);
app.use("/events", eventRoutes);

app.use(errorMiddleware);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
