import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      // 카카오 로그인 사용자 - password X
      required: function () {
        return !this.kakaoId;
      },
    },
    // 카카오 ID
    kakaoId: {
      type: String,
      sparse: true,
      unique: true,
    },
    profileImage: String,
  },
  {
    timestamps: true,
  }
);

export const User = model("User", userSchema);
