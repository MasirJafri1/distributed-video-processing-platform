const { v4: uuidv4 } =
  require("uuid");

const logger =
  require("../utils/logger");

const requestMiddleware =
  (req, res, next) => {

    const requestId = uuidv4();

    req.requestId = requestId;

    logger.info({
      requestId,

      method: req.method,

      path: req.path
    });

    next();
  };

module.exports =
  requestMiddleware;