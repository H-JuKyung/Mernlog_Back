import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// 라우트 가져오기
import authRoutes from "./routes/authRoutes.js";
import kakaoAuthRoutes from "./routes/kakaoAuthRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import userRoutes from "./routes/userRoutes.js";

// 데이터베이스 연결
import connectDB from "./config/db.js";

// 에러 핸들러
import { errorHandler } from "./utils/errorHandler.js";

const app = express();
const port = process.env.PORT || 4000;

// 🌐 배포/개발 환경에 따라 origin 분기
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://mernlog-front.vercel.app"] // Vercel 배포 주소
    : [process.env.FRONTEND_URL]; // 로컬 개발 주소

// CORS 설정
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// JSON 파싱 미들웨어
app.use(express.json());

// 쿠키 파서 미들웨어
app.use(cookieParser());

// 정적 파일 제공 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 정적 파일 접근 시 CORS 오류를 방지하기 위한 설정
app.get("/uploads/:filename", (req, res) => {
  const { filename } = req.params;
  res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0]);
  res.sendFile(path.join(__dirname, "uploads", filename));
});

// 데이터베이스 연결
connectDB();

// 라우트 설정
app.use("/auth", authRoutes); // /auth/register, /auth/login 등
app.use("/auth/kakao", kakaoAuthRoutes); // /auth/kakao
app.use("/posts", postRoutes); // /posts, /posts/:postId 등
app.use("/comments", commentRoutes); // /comments, /comments/:postId 등
app.use("/users", userRoutes); // /users/:userId, /users/update 등

// 404 처리 - 정의되지 않은 경로에 대한 처리
app.use((req, res) => {
  res.status(404).json({ error: "요청한 페이지를 찾을 수 없습니다." });
});

// 에러 핸들러 미들웨어
app.use(errorHandler);

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});

// 프로세스 종료 시 처리
process.on("SIGINT", () => {
  console.log("서버를 종료합니다.");
  process.exit(0);
});

// 예기치 않은 에러 처리
process.on("uncaughtException", (err) => {
  console.error("예기치 않은 에러:", err);
  process.exit(1);
});

export default app;
