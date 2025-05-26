import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { secretKey, tokenLife, cookieOptions } from "../config/jwt.js";

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS);

export const register = async (req, res) => {
  try {
    const { userId, password } = req.body;

    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(409).json({ error: "이미 존재하는 아이디입니다." });
    }

    const userDoc = new User({
      userId,
      password: bcrypt.hashSync(password, saltRounds),
    });
    const savedUser = await userDoc.save();

    res.status(201).json({
      userId: savedUser.userId,
      _id: savedUser._id,
    });
  } catch (err) {
    console.log("에러", err);
    res.status(500).json({ error: "서버 에러" });
  }
};

export const login = async (req, res) => {
  try {
    const { userId, password } = req.body;
    const userDoc = await User.findOne({ userId });
    if (!userDoc) {
      return res.status(401).json({ error: "없는 사용자 입니다." });
    }

    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (!passOk) {
      return res.status(401).json({ error: "비밀번호가 틀렸습니다." });
    } else {
      const { _id, userId } = userDoc;
      const payload = { id: _id, userId };
      const token = jwt.sign(payload, secretKey, {
        expiresIn: tokenLife,
      });

      // 쿠키에 토큰 저장
      res.cookie("token", token, cookieOptions).json({
        id: userDoc._id,
        userId,
      });
    }
  } catch (error) {
    console.error("로그인 오류:", error);
    res.status(500).json({ error: "로그인 실패" });
  }
};

export const getProfile = (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.json({ error: "로그인 필요" });
  }

  jwt.verify(token, secretKey, (err, info) => {
    if (err) {
      return res.json({ error: "로그인 필요" });
    }
    res.json(info);
  });
};

export const logout = (req, res) => {
  const logoutCookieOptions = {
    ...cookieOptions,
    maxAge: 0,
  };

  res
    .cookie("token", "", logoutCookieOptions)
    .json({ message: "로그아웃 되었음" });
};
