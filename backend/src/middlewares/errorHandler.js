// src/middlewares/errorHandler.js

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    req.log.error({ err }, `${req.method} ${req.originalUrl} -> ${statusCode}`);
  } else {
    req.log.warn(`${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`);
  }

  const response = {
    success: false,
    message: statusCode >= 500 ? 'Internal server error' : err.message,
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  res.status(statusCode).json(response);
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} tidak ditemukan` });
}

module.exports = { errorHandler, notFoundHandler };