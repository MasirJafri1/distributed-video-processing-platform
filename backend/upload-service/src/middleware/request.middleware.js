import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";

const requestMiddleware = (req, res, next) => {
  const requestId = uuidv4();

  req.requestId = requestId;

  logger.info({
    requestId,
    method: req.method,
    path: req.path,
  });

  next();
};

export default requestMiddleware;
