// src/utils/asyncHandler.js
// Membungkus controller async supaya error otomatis diteruskan ke
// Global Error Handler (Development Rules §15), tanpa try/catch manual
// berulang di tiap controller.

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
