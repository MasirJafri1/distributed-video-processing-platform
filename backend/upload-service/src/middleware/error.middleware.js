const logger =
  require("../utils/logger");

const errorMiddleware =
  (err, req, res, next) => {

    logger.error({
      requestId:
        req.requestId,

      error: err.message
    });

    return res.status(500).json({
      message:
        "Internal Server Error",

      requestId:
        req.requestId
    });
  };

module.exports =
  errorMiddleware;