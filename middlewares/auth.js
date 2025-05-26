import jwt from "jsonwebtoken";
import { secretKey } from "../config/jwt.js";

export const authenticateToken = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ error: "로그인 필요" });
  }

  try {
    const userInfo = jwt.verify(token, secretKey);
    req.user = userInfo;
    next();
  } catch (err) {
    return res.status(403).json({ error: "유효하지 않은 토큰" });
  }
};

export const optionalAuthenticateToken = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const userInfo = jwt.verify(token, secretKey);
    req.user = userInfo;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};
