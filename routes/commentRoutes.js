import express from "express";
import {
  createComment,
  getCommentsByPostId,
  deleteComment,
  updateComment,
} from "../controllers/commentController.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

router.post("/", authenticateToken, createComment);
router.get("/:postId", getCommentsByPostId);
router.delete("/:commentId", authenticateToken, deleteComment);
router.put("/:commentId", authenticateToken, updateComment);

export default router;
