// src/routes/masterDataImportRoutes.js
const express = require('express');
const multer = require('multer');
const masterDataImportController = require('../controllers/masterDataImportController');
const requireAuth = require('../middlewares/authMiddleware');
const requireMasterDataEditAccess = require('../middlewares/masterDataAccess');
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

// Preview & Commit - Admin selalu boleh, Operator boleh kalau
// allow_operator_edit_master_data = true (sama seperti akses Master Data lain)
router.post('/preview', requireMasterDataEditAccess, handleUpload, masterDataImportController.preview);
router.post('/commit', requireMasterDataEditAccess, masterDataImportController.commit);

module.exports = router;
