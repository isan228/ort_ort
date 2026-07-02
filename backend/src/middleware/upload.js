import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ALLOWED_CERT_MIME,
  ALLOWED_LOGO_MIME,
  MAX_CERT_SIZE_BYTES,
  MAX_LOGO_SIZE_BYTES,
} from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';

function makeStorage(subdir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(process.cwd(), 'uploads', subdir));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

function makeImageFilter(allowedMime, errorCode, message) {
  return (_req, file, cb) => {
    if (!allowedMime.includes(file.mimetype)) {
      return cb(createHttpError(400, errorCode, message));
    }
    cb(null, true);
  };
}

const certStorage = makeStorage('certificates');

export const certificateUpload = multer({
  storage: certStorage,
  fileFilter: makeImageFilter(
    ALLOWED_CERT_MIME,
    'CERT-001',
    'Допустимы только JPEG, PNG или PDF'
  ),
  limits: { fileSize: MAX_CERT_SIZE_BYTES },
});

export const universityLogoUpload = multer({
  storage: makeStorage('universities'),
  fileFilter: makeImageFilter(
    ALLOWED_LOGO_MIME,
    'CAT-002',
    'Логотип: JPEG, PNG, WebP или SVG'
  ),
  limits: { fileSize: MAX_LOGO_SIZE_BYTES },
});
