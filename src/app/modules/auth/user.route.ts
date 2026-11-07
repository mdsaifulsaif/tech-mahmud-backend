

import express from "express";
import { UserControllers } from "./user.controller";
import { isAuthenticated } from "../../middlewares/auth.middleware";
import { upload } from "../../middlewares/multer.middleware";

const router = express.Router();

// Public Routes
router.post("/register", UserControllers.registerUser);
router.post("/login", UserControllers.loginUser);
router.post("/google-login", UserControllers.googleLogin);
router.post("/verify-email", UserControllers.verifyEmail);
router.post("/resend-verification", UserControllers.resendVerificationEmail);
router.post("/refresh-token", UserControllers.refreshAccessToken);
router.post("/forgot-password", UserControllers.forgotPassword);
router.get("/search", isAuthenticated, UserControllers.searchUsers);

// Private Routes
router.post("/logout", isAuthenticated, UserControllers.logoutUser);
router.post("/change-password", isAuthenticated, UserControllers.changePassword);

router.patch(
  "/update-profile",
  isAuthenticated,
  upload.single("avatar"),
  UserControllers.updateProfile
);

router.get("/get-me", isAuthenticated, UserControllers.getMe);




router.post("/reset-password/:token", UserControllers.resetPassword);



export const UserRoutes = router;

