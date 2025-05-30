import express from "express";
import {
  register,
  login,
  getProfile,
  logout,
  deleteAccount,
  checkUserIdDuplicate,
} from "../controllers/authController.js";

import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", getProfile);
router.post("/logout", logout);
router.delete("/delete-account", authenticateToken, deleteAccount);
router.get("/check-duplicate", checkUserIdDuplicate);

export default router;
