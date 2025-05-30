import dotenv from "dotenv";
dotenv.config();

export const secretKey = process.env.JWT_SECRET;
export const tokenLife = process.env.JWT_EXPIRATION;

export const cookieOptions = {
  httpOnly: true,
  maxAge: 1000 * 60 * 60, // 1시간
  secure: true, // HTTPS 환경에서만 작동하도록 설정
  sameSite: "none", // 크로스 도메인 요청 허용
  path: "/",
};
