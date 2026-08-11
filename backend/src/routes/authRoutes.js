// src/routes/authRoutes.js
const express = require('express');
const multer = require('multer');
const authController = require('../controllers/authController');
const requireAuth = require('../middlewares/authMiddleware');
const loginRateLimiter = require('../middlewares/loginRateLimiter');
const AppError = require('../utils/AppError');

const router = express.Router();

// Foto profil - memory storage (bukan disk multer, kita yang nulis ke disk
// sendiri di profileService.updateAvatar biar nama filenya kita kontrol,
// bukan langsung dari originalname user). Batas 2MB - foto profil, bukan
// dokumen. Validasi tipe file (JPG/PNG/WebP) SENGAJA dicek dua kali: di
// sini (fileFilter, gagal cepat sebelum body abis kebaca) DAN lagi di
// profileService.updateAvatar (defense in depth, gak percaya cuma dari 1
// lapis) - pola yang sama dengan masterDataImportRoutes.js.
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okMime = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (!okMime) {
      cb(new Error('File harus berformat JPG, PNG, atau WebP'));
      return;
    }
    cb(null, true);
  },
});

function handleAvatarUpload(req, res, next) {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      return next(AppError.badRequest('Upload gagal', { avatar: err.message }));
    }
    next();
  });
}

// Public
router.post('/login', loginRateLimiter, authController.login);
router.post('/register', loginRateLimiter, authController.register);

// Semua user login
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.patch('/me', requireAuth, authController.updateProfile);
router.patch('/me/password', requireAuth, authController.changePassword);
router.post('/me/avatar', requireAuth, handleAvatarUpload, authController.uploadAvatar);
router.delete('/me/avatar', requireAuth, authController.deleteAvatar);

module.exports = router;
