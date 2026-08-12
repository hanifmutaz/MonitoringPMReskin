// src/controllers/notificationController.js
const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const data = await notificationService.getRecentNotifications({ limit });
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = { list };