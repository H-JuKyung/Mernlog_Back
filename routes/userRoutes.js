import express from "express";
import {
  getUserInfo,
  getUserPosts,
  getUserComments,
  getUserLikedPosts,
  updateUser,
} from "../controllers/userController.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/:userId", getUserInfo);
router.get("/:userId/posts", getUserPosts);
router.get("/:userId/comments", getUserComments);
router.get("/:userId/likes", getUserLikedPosts);
router.put("/update", authenticateToken, updateUser);

export default router;
