import { User } from "../models/User.js";
import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";
import bcrypt from "bcryptjs";

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS);

export const getUserInfo = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }, { password: 0 });

    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    res.json(user);
  } catch (err) {
    console.error("사용자 정보 조회 오류:", err);
    res.status(500).json({ error: "사용자 정보 조회에 실패했습니다." });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ author: userId }).sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error("사용자 게시물 조회 오류:", err);
    res.status(500).json({ error: "사용자 게시물 조회에 실패했습니다." });
  }
};

export const getUserComments = async (req, res) => {
  try {
    const { userId } = req.params;
    const comments = await Comment.find({ author: userId }).sort({
      createdAt: -1,
    });

    res.json(comments);
  } catch (err) {
    console.error("사용자 댓글 조회 오류:", err);
    res.status(500).json({ error: "사용자 댓글 조회에 실패했습니다." });
  }
};

export const getUserLikedPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    // 먼저 사용자 ID 찾기
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // 사용자가 좋아요한 게시물 찾기
    const likedPosts = await Post.find({ likes: user._id }).sort({
      createdAt: -1,
    });

    res.json(likedPosts);
  } catch (err) {
    console.error("사용자 좋아요 게시물 조회 오류:", err);
    res
      .status(500)
      .json({ error: "사용자 좋아요 게시물 조회에 실패했습니다." });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;
    const updateData = {};

    // 비밀번호 변경이 있는 경우 해싱
    if (password) {
      updateData.password = bcrypt.hashSync(password, saltRounds);
    }

    // 다른 필드들도 업데이트 가능하도록 확장 가능

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      select: "-password",
    });

    res.json({
      message: "사용자 정보가 수정되었습니다.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("사용자 정보 수정 오류:", err);
    res.status(500).json({ error: "사용자 정보 수정에 실패했습니다." });
  }
};
