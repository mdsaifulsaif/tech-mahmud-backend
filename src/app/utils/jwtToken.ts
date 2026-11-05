



import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Response } from "express";
import { IUser } from "../modules/auth/user.interface";
import { User } from "../modules/auth/user.model";

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days 

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: ACCESS_TOKEN_MAX_AGE / 1000, // ✅ সেকেন্ডে কনভার্ট করে দিলাম, একই constant ব্যবহার হচ্ছে
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as any,
  });
};

const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const isProduction =
  process.env.NODE_ENV === "production" &&
  !process.env.CLIENT_URL?.includes("localhost");

export const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: "/",
};

export const sendToken = async (
  user: IUser,
  statusCode: number,
  res: Response
) => {
  const payload: TokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await User.findByIdAndUpdate(user._id, {
    refreshToken: hashToken(refreshToken),
  });

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  const userObj: any = user.toObject ? user.toObject() : user;
  delete userObj.password;
  delete userObj.refreshToken;
  delete userObj.verificationToken;
  delete userObj.verificationTokenExpires;

  res.status(statusCode).json({
    success: true,
    message: "Success",
    accessToken,
    refreshToken,
    accessTokenExpires: Date.now() + ACCESS_TOKEN_MAX_AGE, // ✅ এখন same constant থেকে আসছে, sync থাকবে
    data: userObj,
  });
};

export const clearAuthCookies = (res: Response) => {
  res.cookie("accessToken", null, { ...cookieOptions, expires: new Date(0) });
  res.cookie("refreshToken", null, { ...cookieOptions, expires: new Date(0) });
};

export { hashToken, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE };

