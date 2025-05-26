import dotenv from "dotenv";
dotenv.config();

import express from "express";
const app = express();
const port = process.env.PORT;

import cors from "cors";
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

import cookieParser from "cookie-parser";
app.use(cookieParser());

import mongoose from "mongoose";
import { userModel } from "./model/user.js";
mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME,
  })
  .then(() => {
    console.log("MongoDB 연결됨");
  })
  .catch((err) => {
    console.log("MongoDB 연결 안됨", err);
  });

import bcrypt from "bcryptjs";
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS);

import jwt from "jsonwebtoken";
const secretKey = process.env.JWT_SECRET;
const tokenLife = process.env.JWT_EXPIRATION;

const cookieOptions = {
  httpOnly: true,
  maxAge: 1000 * 60 * 60,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

// 회원가입
app.post("/register", async (req, res) => {
  try {
    console.log("----", req.body);
    const { id, password } = req.body;

    const existingUser = await userModel.findOne({ id });
    if (existingUser) {
      return res.status(409).json({ error: "이미 존재하는 아이디입니다." });
    }

    const userDoc = new userModel({
      id,
      password: bcrypt.hashSync(password, saltRounds),
    });

    const savedUser = await userDoc.save();

    res.status(201).json({
      msg: "회원가입 성공",
      id: savedUser.id,
    });
  } catch (err) {
    console.log("회원가입 오류: ", err);
    res.status(500).json({ error: "회원가입 실패" });
  }
});

// 로그인
app.post("/login", async (req, res) => {
  try {
    const { id, password } = req.body;
    const userDoc = await userModel.findOne({ id });
    if (!userDoc) {
      return res.status(401).json({ error: "없는 사용자입니다." });
    }

    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (!passOk) {
      return res.status(401).json({ error: "비밀번호가 틀렸습니다" });
    } else {
      const { _id, id } = userDoc;
      const payload = { id: _id, id };
      const token = jwt.sign(payload, secretKey, {
        expiresIn: tokenLife,
      });

      res.cookie("token", token, cookieOptions).json({
        id: userDoc._id,
        id,
      });
    }
  } catch (err) {
    console.log("로그인 오류: ", err);
    res.status(500).json({ error: "로그인 실패" });
  }
});

// 회원정보 조회
app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  console.log("쿠키", token);
  if (!token) {
    return res.json({ error: "로그인 필요" });
  }
  jwt.verify(token, secretKey, (err, info) => {
    if (err) {
      return res.json({ error: "로그인 필요" });
    }
    res.json(info);
  });
});

// 로그아웃
app.post("/logout", (req, res) => {
  const logoutCookieOptions = {
    ...cookieOptions,
    maxAge: 0,
  };

  res
    .cookie("token", "", logoutCookieOptions)
    .json({ message: "로그아웃 되었음" });
});

import multer from "multer";
import path from "path";
import fs from "fs";
import { postModel } from "./model/post.js";

import { fileURLToPath } from "url";
// __dirname 설정 (ES 모듈에서는 __dirname이 기본적으로 제공되지 않음)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// uploads 폴더의 파일들을 /uploads 경로로 제공
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 정적 파일 접근 시 CORS 오류를 방지하기 위한 설정
app.get("/uploads/:filename", (req, res) => {
  const { filename } = req.params;
  res.sendFile(path.join(__dirname, "uploads", filename));
});

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.post("/postWrite", upload.single("files"), async (req, res) => {
  try {
    const { title, summary, content } = req.body;
    const { token } = req.cookies;
    if (!token) {
      return res.status(401).json({ error: "로그인 필요" });
    }

    const userInfo = jwt.verify(token, secretKey);

    const postData = {
      title,
      summary,
      content,
      cover: req.file ? req.file.path : null, // 파일 경로 저장
      author: userInfo.id,
    };

    await postModel.create(postData);
    console.log("포스트 등록 성공");

    res.json({ message: "포스트 글쓰기 성공" });
  } catch (err) {
    console.log("에러", err);
    return res.status(500).json({ error: "서버 에러" });
  }
});

app.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`);
});
