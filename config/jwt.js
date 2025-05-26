import dotenv from "dotenv";
dotenv.config();

export const secretKey = process.env.JWT_SECRET;
export const tokenLife = process.env.JWT_EXPIRATION;

export const cookieOptions = {
  httpOnly: true,
  maxAge: 1000 * 60 * 60, // 1시간
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};
