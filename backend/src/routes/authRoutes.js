// src/routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authController');
const requireAuth = require('../middlewares/authMiddleware');
const loginRateLimiter = require('../middlewares/loginRateLimiter');

const router = express.Router();

// Public
router.post('/login', loginRateLimiter, authController.login);
router.post('/register', loginRateLimiter, authController.register);

// Semua user login
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
