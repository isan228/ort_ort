import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ALLOWED_CERT_MIME, MAX_CERT_SIZE_BYTES } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'certificates'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_CERT_MIME.includes(file.mimetype)) {
    return cb(createHttpError(400, 'CERT-001', 'Допустимы только JPEG, PNG или PDF'));
  }
  cb(null, true);
}

export const certificateUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_CERT_SIZE_BYTES },
});
