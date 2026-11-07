import { IUser } from "./user.interface";
import { User } from "./user.model";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const emailQuery = (email: string) => ({
  email: { $regex: new RegExp(`^${escapeRegex(email.trim())}$`, "i") },
});

const registerUserIntoDB = async (payload: Partial<IUser>) => {
  const result = await User.create(payload);
  return result;
};

const findUserByEmail = async (email: string, includePassword = false) => {
  const query = User.findOne(emailQuery(email));
  if (includePassword) query.select("+password");
  return await query;
};

const updateProfileInDB = async (id: string, payload: Partial<IUser>) => {
  const result = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const findUserById = async (id: string) => {
  return await User.findById(id);
};

const getMeFromDB = async (id: string) => {
  return await User.findById(id).select("-password");
};

const findUserWithPassword = async (id: string) => {
  return await User.findById(id).select("+password");
};

// for forgate pass
const findUserForPasswordReset = async (email: string) => {
  return await User.findOne({ email });
};

const findUserByResetToken = async (hashedToken: string) => {
  return await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordToken +resetPasswordExpires +password");
};

const verifyUserEmailInDB = async (email: string, hashedCode: string) => {
  const user = await User.findOne({
    ...emailQuery(email),
    verificationToken: hashedCode,
    verificationTokenExpires: { $gt: new Date() },
  }).select("+verificationToken +verificationTokenExpires");

  if (!user) return null;

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return user;
};

const findUserForVerification = async (email: string) => {
  return await User.findOne(emailQuery(email)).select(
    "+verificationToken +verificationTokenExpires",
  );
};

const findUserWithRefreshToken = async (id: string) => {
  return await User.findById(id).select("+refreshToken");
};

const clearRefreshTokenInDB = async (id: string) => {
  return await User.findByIdAndUpdate(id, { refreshToken: null });
};

// --- Google Auth এর জন্য নতুন ---

const findUserByGoogleId = async (googleId: string) => {
  return await User.findOne({ googleId });
};

const createGoogleUserInDB = async (payload: {
  firstName: string;
  lastName: string;
  email: string;
  googleId: string;
  avatarUrl?: string;
}) => {
  const result = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    googleId: payload.googleId,
    authProvider: "google",
    isVerified: true, // Google আগে থেকেই verify করা
    avatar: payload.avatarUrl ? { url: payload.avatarUrl } : undefined,
  });
  return result;
};

const changePasswordInDB = async (
  userId: string,
  currentPass: string,
  newPass: string
) => {
  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.password) {
    throw new Error("Local password is not set for this account");
  }

  const isMatched = await User.isPasswordMatched(currentPass, user.password);
  if (!isMatched) {
    throw new Error("Current password does not match");
  }

  user.password = newPass;
  await user.save();
  return true;
};

export const UserServices = {
  registerUserIntoDB,
  findUserByEmail,
  updateProfileInDB,
  findUserById,
  findUserForPasswordReset,
  findUserByResetToken,
  getMeFromDB,
  findUserWithPassword,
  verifyUserEmailInDB,
  findUserForVerification,
  findUserWithRefreshToken,
  clearRefreshTokenInDB,
  findUserByGoogleId,
  createGoogleUserInDB,
  changePasswordInDB,
};
