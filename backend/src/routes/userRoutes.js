import express from "express";
import passport from "passport";

import {
  registerUser,
  loginUser,
  profile,
  logout,
  forgotPassword,
  resetPassword,
  refreshToken
} from "../services/userService.js";

import { authLimiter, generateAccessToken } from "../utils/jwt.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);

router.get("/profile", authenticate, profile);

router.post("/logout", authLimiter, logout);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

router.post("/refresh", refreshToken);


// Google Login
// router.get(
//   "/google",
//   passport.authenticate("google", {
//     scope: ["profile", "email"],
//   })
// );

// router.get(
//   "/google/callback",
//   passport.authenticate("google", { session: false }),
//   (req, res) => {
//     const accessToken = generateAccessToken(req.user);

//     res.redirect(`http://localhost:3000/oauth-success?token=${accessToken}`);
//   }
// );

export default router;