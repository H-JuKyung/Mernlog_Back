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
    const { userId, password } = req.body;

    const existingUser = await userModel.findOne({ userId });
    if (existingUser) {
      return res.status(409).json({ error: "이미 존재하는 아이디입니다." });
    }

    const userDoc = new userModel({
      userId,
      password: bcrypt.hashSync(password, saltRounds),
    });

    const savedUser = await userDoc.save();

    res.status(201).json({
      msg: "회원가입 성공",
      userId: savedUser.userId,
    });
  } catch (err) {
    console.log("회원가입 오류: ", err);
    res.status(500).json({ error: "회원가입 실패" });
  }
});

// 로그인
app.post("/login", async (req, res) => {
  try {
    const { userId, password } = req.body;
    const userDoc = await userModel.findOne({ userId });
    if (!userDoc) {
      return res.status(401).json({ error: "없는 사용자입니다." });
    }

    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (!passOk) {
      return res.status(401).json({ error: "비밀번호가 틀렸습니다" });
    } else {
      const { _id, userId } = userDoc;
      const payload = { id: _id, userId };
      const token = jwt.sign(payload, secretKey, {
        expiresIn: tokenLife,
      });

      res.cookie("token", token, cookieOptions).json({
        id: userDoc._id,
        userId,
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

// 글쓰기
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
      author: userInfo.userId,
    };

    await postModel.create(postData);
    console.log("포스트 등록 성공");

    res.json({ message: "포스트 글쓰기 성공" });
  } catch (err) {
    console.log("에러", err);
    return res.status(500).json({ error: "서버 에러" });
  }
});

// 글 목록 조회 - 페이지네이션 추가
app.get("/postlist", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 3;
    const skip = page * limit;

    // 총 게시물 수 조회
    const total = await postModel.countDocuments();

    // 페이지네이션 적용하여 게시물 조회
    const posts = await postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // 각 포스트의 댓글 수 조회
    const postsWithCommentCounts = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await commentModel.countDocuments({
          postId: post._id,
        });
        const postObject = post.toObject();
        postObject.commentCount = commentCount;
        return postObject;
      })
    );

    // 마지막 페이지 여부 확인
    const hasMore = total > skip + posts.length;

    res.json({
      posts: postsWithCommentCounts,
      hasMore,
      total,
    });
  } catch (err) {
    console.error("게시물 조회 오류:", err);
    res.status(500).json({ error: "게시물 조회에 실패했습니다." });
  }
});

// 글 상세 조회
app.get("/post/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
    }

    // 댓글 수 조회
    const commentCount = await commentModel.countDocuments({ postId });

    // 응답 객체 생성
    const postWithCommentCount = post.toObject();
    postWithCommentCount.commentCount = commentCount;

    res.json(postWithCommentCount);
  } catch (err) {
    console.error("게시물 상세 조회 오류:", err);
    res.status(500).json({ error: "게시물 상세 조회에 실패했습니다." });
  }
});

// 글 삭제
app.delete("/post/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await postModel.findByIdAndDelete(postId);
    if (!post) {
      return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
    }
    res.json({ message: "게시물이 삭제되었습니다." });
  } catch (err) {
    console.error("게시물 삭제 오류:", err);
    res.status(500).json({ error: "게시물 삭제에 실패했습니다." });
  }
});

// 글 수정
app.put("/post/:postId", upload.single("files"), async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, summary, content } = req.body;
    const { token } = req.cookies;

    // 로그인 확인
    if (!token) {
      return res.status(401).json({ error: "로그인 필요" });
    }

    // 토큰 검증
    const userInfo = jwt.verify(token, secretKey);

    // 게시물 조회
    const post = await postModel.findById(postId);

    // 게시물이 존재하지 않을 경우
    if (!post) {
      return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
    }

    // 작성자 확인 (자신의 글만 수정 가능)
    if (post.author !== userInfo.userId) {
      return res.status(403).json({ error: "자신의 글만 수정할 수 있습니다." });
    }

    // 수정할 데이터 객체 생성
    const updateData = {
      title,
      summary,
      content,
    };

    // 새 파일이 업로드된 경우 파일 경로 업데이트
    if (req.file) {
      updateData.cover = req.file.path;
    }

    // 게시물 업데이트
    const updatedPost = await postModel.findByIdAndUpdate(
      postId,
      updateData,
      { new: true } // 업데이트된 문서 반환
    );

    res.json({
      message: "게시물이 수정되었습니다.",
      post: updatedPost,
    });
  } catch (err) {
    console.error("게시물 수정 오류:", err);
    res.status(500).json({ error: "게시물 수정에 실패했습니다." });
  }
});

// 글 좋아요
app.post("/like/:postId", async (req, res) => {
  const { postId } = req.params;

  try {
    // JWT 토큰 인증 및 userId 추출
    const { token } = req.cookies;
    if (!token) {
      return res.status(401).json({ message: "로그인 필요" });
    }

    const userInfo = jwt.verify(token, secretKey);
    const userId = userInfo.userId;

    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    const likeIndex = post.likes.findIndex((id) => id.toString() === userId);
    if (likeIndex > -1) {
      // 이미 좋아요 누른 상태 → 취소
      post.likes.splice(likeIndex, 1);
    } else {
      // 좋아요 추가
      post.likes.push(userId);
    }

    await post.save();
    res.json(post);
  } catch (error) {
    console.error("좋아요 토글 기능 오류:", error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 댓글 관련 api
import { commentModel } from "./model/comment.js";

// 댓글 작성
app.post("/comments", async (req, res) => {
  const { content, author, postId } = req.body;

  try {
    const newComment = await commentModel.create({
      content,
      author,
      postId,
    });

    res.status(201).json(newComment);
  } catch (error) {
    console.error("댓글 작성 오류:", error);
    res.status(500).json({ error: "댓글 작성에 실패했습니다." });
  }
});

// 댓글 삭제
app.delete("/comments/:commentId", async (req, res) => {
  const { commentId } = req.params;

  try {
    const comment = await commentModel.findByIdAndDelete(commentId);
    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }
    // res.json(comment);
    res.json({ message: "댓글이 삭제되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

app.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`);
});
