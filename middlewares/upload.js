import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// 업로드 디렉토리 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads");

// 업로드 디렉토리가 없으면 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// multer 스토리지 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// 기본 multer 인스턴스
const multerUpload = multer({ storage });

/**
 * 파일 업로드 및 경로 정규화 미들웨어
 * 업로드된 파일의 경로를 상대 경로(uploads/filename.ext)로 변환
 */
export const upload = {
  single: (fieldName) => (req, res, next) => {
    multerUpload.single(fieldName)(req, res, (err) => {
      if (err) return next(err);

      // 파일이 업로드된 경우 경로 정규화
      if (req.file) {
        req.file.path = `uploads/${req.file.filename}`;
      }
      next();
    });
  },
};
