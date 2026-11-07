
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserServices } from "./user.service";
import {
  sendToken,
  clearAuthCookies,
  hashToken,
  generateAccessToken,
  ACCESS_TOKEN_MAX_AGE,
  cookieOptions,
} from "../../utils/jwtToken";
import {  sendResetPasswordEmail, sendVerificationEmail } from "../../utils/sendEmail";
// import { sendVerificationEmail } from "../../utils/sendEmail";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { deleteFromCloudinary } from "../../utils/deleteFromCloudinary";
// import { hashToken, generateAccessToken, ACCESS_TOKEN_MAX_AGE } from "../../utils/jwtToken"; 
import { User } from "./user.model";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, ...rest } = req.body;

  if (!firstName || !lastName) {
    throw new Error("First name and last name are required!");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const userExists = await UserServices.findUserByEmail(normalizedEmail, true);

  if (userExists) {
    if (userExists.isVerified) {
      throw new Error("User already exists with this email! Please login.");
    }

    // User exists but has not verified email yet. Update info and send fresh code.
    userExists.firstName = firstName;
    userExists.lastName = lastName;
    userExists.password = password; // pre-save hook will hash password
    if (rest.phoneNumber) {
      userExists.phoneNumber = rest.phoneNumber;
    }

    const code = userExists.createVerificationToken();
    await userExists.save();

    await sendVerificationEmail(userExists.email, userExists.firstName, code);

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Verification code sent to your email. Please verify your account.",
      data: { email: userExists.email },
    });
  }

  // bcrypt.hash model এর hook করে দিবে
  const userData = {
    ...rest,
    firstName,
    lastName,
    email: normalizedEmail,
    password,
  };

  const newUser = await UserServices.registerUserIntoDB(userData);

  const code = newUser.createVerificationToken();
  await newUser.save({ validateBeforeSave: false });

  await sendVerificationEmail(newUser.email, newUser.firstName, code);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Registration successful! Please check your email for the verification code.",
    data: { email: newUser.email },
  });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { email, code } = req.body as { email?: string; code?: string };

  if (!email || !code) {
    throw new Error("Email and verification code are required!");
  }

  const hashedCode = crypto
    .createHash("sha256")
    .update(String(code).trim())
    .digest("hex");

  const user = await UserServices.verifyUserEmailInDB(email, hashedCode);

  if (!user) {
    throw new Error("Verification code is invalid or has expired!");
  }

  await sendToken(user as any, 200, res);
});

const resendVerificationEmail = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) throw new Error("Email is required!");

  const user = await UserServices.findUserForVerification(email.toLowerCase().trim());

  if (!user) throw new Error("No account found with this email!");
  if (user.isVerified) throw new Error("This account is already verified!");

  const code = user.createVerificationToken();
  await user.save({ validateBeforeSave: false });

  await sendVerificationEmail(user.email, user.firstName, code);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "A new verification code has been sent. Please check your inbox.",
    data: null,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new Error("Please enter both email and password");
  }

  const user = await UserServices.findUserByEmail(email, true);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.status === "blocked") {
    return res.status(403).json({
      success: false,
      message:
        "Access Denied! Your account is currently blocked. Please contact support.",
    });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email before logging in.",
    });
  }

  const isPasswordMatched = await (User as any).isPasswordMatched(
    password,
    user.password
  );

  if (!isPasswordMatched) {
    throw new Error("Invalid email or password");
  }

  await sendToken(user as any, 200, res);
});

// google login 
const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const { email, firstName, lastName, googleId, avatarUrl } = req.body;

  if (!email || !googleId) {
    throw new Error("Email and googleId are required!");
  }

  // প্রথমে googleId দিয়ে খুঁজবে
  let user = await UserServices.findUserByGoogleId(googleId);

  if (!user) {
    // googleId দিয়ে না পেলে, email দিয়ে চেক করবে (আগে হয়তো normal signup করেছিল)
    const existingUser = await UserServices.findUserByEmail(email);

    if (existingUser) {
      // আগের local account কে google এর সাথে link করে দিবে
      existingUser.googleId = googleId;
      existingUser.authProvider = "google";
      existingUser.isVerified = true;
      await existingUser.save({ validateBeforeSave: false });
      user = existingUser;
    } else {
      // একদম নতুন user
      user = await UserServices.createGoogleUserInDB({
        firstName: firstName || "Google",
        lastName: lastName || "User",
        email,
        googleId,
        avatarUrl,
      });
    }
  }

  if (user.status === "blocked") {
    return res.status(403).json({
      success: false,
      message: "Access Denied! Your account is currently blocked.",
    });
  }

  await sendToken(user as any, 200, res);
});




// --- Refresh Token ---
const refreshAccessToken = catchAsync(async (req: Request, res: Response) => {
  console.log("🔄 REFRESH TOKEN API HIT!", new Date().toISOString()); 
  const token =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    (req.headers["x-refresh-token"] as string);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No refresh token found. Please login again.",
    });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
  } catch (error) {
    clearAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "Refresh token expired or invalid. Please login again.",
    });
  }

  const user = await UserServices.findUserWithRefreshToken(decoded.id);

  if (!user || !user.refreshToken) {
    clearAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "Please login again.",
    });
  }

  const isSameToken = hashToken(token) === user.refreshToken;

  if (!isSameToken) {
    clearAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "Refresh token mismatch. Please login again.",
    });
  }

  const newAccessToken = generateAccessToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  const accessTokenExpires = Date.now() + ACCESS_TOKEN_MAX_AGE;

  res.cookie("accessToken", newAccessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  res.status(200).json({
    success: true,
    message: "Access token refreshed successfully",
    accessToken: newAccessToken,
    accessTokenExpires,
    data: {
      accessToken: newAccessToken,
      accessTokenExpires,
    },
  });
});



const logoutUser = catchAsync(async (req: any, res: Response) => {
  if (req.user?._id) {
    await UserServices.clearRefreshTokenInDB(req.user._id.toString());
  }

  clearAuthCookies(res);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Logged Out Successfully",
    data: null,
  });
});



const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id;
  const user = await User.findById(userId).select("+password");

  if (!user) throw new Error("User not found!");

  const {
    firstName,
    lastName,
    phoneNumber,
    addressLine,
    city,
    state,
    postalCode,
    currentPassword,
    newPassword,
  } = req.body;

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phoneNumber) user.phoneNumber = phoneNumber;

  if (req.file) {
    if (user.avatar?.public_id) {
      await deleteFromCloudinary(user.avatar.public_id);
    }

    const uploadResult: any = await uploadToCloudinary(
      req.file.buffer,
      "avatars"
    );
    user.avatar = {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url || uploadResult.url,
    };
  }

  if (addressLine || city || state || postalCode) {
    const existing = user.shippingAddress || {};
    user.shippingAddress = {
      addressLine: addressLine || existing.addressLine || "",
      city: city || existing.city || "",
      state: state || existing.state || "",
      postalCode: postalCode || existing.postalCode || "",
      country: "Bangladesh",
    };
  }

  if (currentPassword && newPassword) {
    const isPasswordMatch = await (User as any).isPasswordMatched(
      currentPassword,
      user.password
    );

    if (!isPasswordMatch) throw new Error("Current password is incorrect!");

    user.password = newPassword;
  }

  await user.save(); // একবারই save, সব field একসাথে

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully!",
    data: user,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new Error("You are not authorized!");
  }

  const result = await UserServices.getMeFromDB(userId.toString());

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile retrieved successfully!",
    data: result,
  });
});


const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) throw new Error("Email is required!");

  const user = await UserServices.findUserForPasswordReset(email);

  // security practice: user না থাকলেও same success message দিবে,
  // যাতে কেউ email exist করে কিনা বুঝতে না পারে
  if (!user) {
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "If this email is registered, a reset link has been sent.",
      data: null,
    });
  }

  if (user.authProvider === "google") {
    throw new Error(
      "This account uses Google login. Please sign in with Google."
    );
  }

  const rawToken = user.createResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;



  await sendResetPasswordEmail(user.email, user.firstName, resetUrl);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "If this email is registered, a reset link has been sent.",
    data: null,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const { newPassword } = req.body;

  if (!newPassword) throw new Error("New password is required!");

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await UserServices.findUserByResetToken(hashedToken);

  if (!user) {
    throw new Error("Reset link is invalid or has expired!");
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  // refresh token ও clear করে দিব - security এর জন্য,
  // password change হলে আগের সব session invalidate হওয়া উচিত
  user.refreshToken = undefined;

  await user.save();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password reset successful! Please login with your new password.",
    data: null,
  });
});


 const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || (query as string).trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const regex = new RegExp((query as string).trim(), "i");

    const users = await User.find({
      role: "user",
      $or: [
        { firstName: regex },
        { lastName: regex },
        { fullName: regex },
        { phoneNumber: regex },
        { email: regex },
      ],
    })
      .select("firstName lastName fullName phoneNumber email avatar")
      .limit(10);

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to search users",
    });
  }
};

const changePassword = catchAsync(async (req: any, res: Response) => {
  const userId = req.user?._id || req.user?.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "Current password and new password are required",
      data: null,
    });
  }

  await UserServices.changePasswordInDB(userId, currentPassword, newPassword);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password changed successfully!",
    data: null,
  });
});

export const UserControllers = {
  registerUser,
  loginUser,
  googleLogin,
  logoutUser,
  updateProfile,
  getMe,
  verifyEmail,
  resendVerificationEmail,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  searchUsers,
  changePassword,
};
