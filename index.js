import dotenv from "dotenv";
dotenv.config();

import express from "express";
const app = express();
const port = process.env.PORT;

app.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`);
});

import cors from "cors";
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
    console.log("에러", err);
    res.status(500).json({ error: "서버 에러" });
  }
});
