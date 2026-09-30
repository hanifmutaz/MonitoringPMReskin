// src/routes/masterDataImportRoutes.js
const express = require('express');
const multer = require('multer');
const masterDataImportController = require('../controllers/masterDataImportController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');
const AppError = require('../utils/AppError');

// File di-simpan di memory (bukan disk) - cukup buat file Excel Master Data
// yang ukurannya wajar, dan kita gak butuh nyimpen file-nya permanen setelah
// diparse. Batas 10MB - Master Data Excel jarang lebih dari beberapa MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okExt = /\.(xlsx|xlsm|xls)$/i.test(file.originalname);
    if (!okExt) {
      cb(new Error('File harus berformat .xlsx, .xlsm, atau .xls'));
      return;
    }
    cb(null, true);
  },
});

const router = express.Router();
router.use(requireAuth);

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return next(AppError.badRequest('Upload gagal', { file: err.message }));
    }
    next();
  });
}

// Preview & Commit - permission 'masterdata.edit' (sama seperti akses Master Data lain)
router.post('/preview', requirePermission('masterdata.edit'), handleUpload, masterDataImportController.preview);
router.post('/commit', requirePermission('masterdata.edit'), masterDataImportController.commit);

module.exports = router;
