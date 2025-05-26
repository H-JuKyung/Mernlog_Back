import axios from "axios";
import { User } from "../models/User.js";
import jwt from "jsonwebtoken";
import { secretKey, tokenLife, cookieOptions } from "../config/jwt.js";
import { kakaoConfig } from "../config/oauth.js";

// 카카오 로그인 페이지로 리다이렉트
export const kakaoLogin = (req, res) => {
  console.log("kakaoConfig:", kakaoConfig);
  const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoConfig.clientID}&redirect_uri=${kakaoConfig.callbackURL}&response_type=code`;

  console.log("kakaoAuthURL:", kakaoAuthURL);
  res.redirect(kakaoAuthURL);
};

// 카카오 콜백 처리
export const kakaoCallback = async (req, res) => {
  const { code } = req.query;
  console.log("인증 코드:", code);

  try {
    // 액세스 토큰 요청
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("client_id", kakaoConfig.clientID);
    params.append("client_secret", kakaoConfig.clientSecret);
    params.append("redirect_uri", kakaoConfig.callbackURL);
    params.append("code", code);

    const tokenResponse = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      }
    );

    console.log("토큰 응답:", tokenResponse.data);
    const { access_token } = tokenResponse.data;

    // 카카오 API로 사용자 정보 요청
    const userResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    console.log("사용자 정보:", userResponse.data);
    const kakaoId = userResponse.data.id.toString();
    const nickname = userResponse.data.properties?.nickname || "카카오사용자";
    const profileImage = userResponse.data.properties?.profile_image || "";

    // DB에서 해당 카카오 ID로 사용자 찾기
    let user = await User.findOne({ kakaoId });

    if (!user) {
      // 새 사용자 생성 - kakaoId 필드 사용
      user = new User({
        userId: `${nickname}_${Date.now().toString().slice(-4)}`, // 유니크하게 생성
        kakaoId, // 카카오 ID 저장
        profileImage,
        // password 필드를 제공하지 않음
      });

      await user.save();
      console.log("새 사용자 생성 완료:", user);
    }

    // JWT 토큰 생성
    const payload = { id: user._id, userId: user.userId };
    const token = jwt.sign(payload, secretKey, {
      expiresIn: tokenLife,
    });

    // 쿠키에 토큰 저장 및 프론트엔드로 리다이렉트
    res
      .cookie("token", token, cookieOptions)
      .redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/`);
  } catch (error) {
    console.error("카카오 로그인 오류:", error);
    res
      .status(500)
      .json({ error: "카카오 로그인 처리 중 오류가 발생했습니다." });
  }
};
