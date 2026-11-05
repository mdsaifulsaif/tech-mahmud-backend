
import { Schema, model } from "mongoose";
import { IUser, IUserModel } from "./user.interface";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fullName: { type: String },
    email: { type: String, required: true, unique: true },

    password: {
      type: String,
      select: false,
      required: function (this: IUser) {
        return this.authProvider === "local";
      },
    },

    role: { type: String, enum: ["user", "admin"], default: "user" },
    phoneNumber: { type: String },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    avatar: {
      public_id: { type: String },
      url: { type: String, default: "https://example.com/default-avatar.png" },
    },
    shippingAddress: {
      addressLine: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "Bangladesh" },
    },

    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    verificationTokenExpires: { type: Date, select: false },

    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    refreshToken: { type: String, select: false },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: { type: String },
  },
  { timestamps: true }
);

// fullName auto-generate
userSchema.pre("save", async function () {
  if (this.isModified("firstName") || this.isModified("lastName") || this.isNew) {
    this.fullName = `${this.firstName} ${this.lastName}`.trim();
  }
});

// password auto-hash - password field modify হলেই চলবে
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.statics.isPasswordMatched = async function (
  givenPassword,
  hashedPassword
) {
  return await bcrypt.compare(givenPassword, hashedPassword);
};

userSchema.methods.createVerificationToken = function (): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  this.verificationToken = crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");

  this.verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

  return code;
};

userSchema.methods.createResetPasswordToken = function (): string {
  const rawToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  this.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

  return rawToken;
};

// --- TTL Index for Unverified Users ---
userSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 86400, // ৮৬৪০০ সেকেন্ড = ২৪ ঘণ্টা
    partialFilterExpression: { isVerified: false }, // শুধু যাদের isVerified: false তাদের জন্যই কাজ করবে
  }
);

export const User = model<IUser, IUserModel>("User", userSchema);