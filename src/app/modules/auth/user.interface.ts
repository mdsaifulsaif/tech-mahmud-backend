// import { Document, Model } from "mongoose";

// export interface IUser extends Document {
//   firstName: string;
//   lastName: string;
//   email: string;
//   password: string;
//   name: string;
//   role: "user" | "admin";
//   phoneNumber?: string;
//   status: "active" | "blocked";
//   avatar?: {
//     public_id: string;
//     url: string;
//   };

//   shippingAddress?: {
//     addressLine?: string;
//     city?: string;
//     state?: string;
//     postalCode?: string;
//     country?: string;
//   };
//   isVerified?: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface IUserModel extends Model<IUser> {
//   isPasswordMatched(password: string, hashedPassword: string): Promise<boolean>;
// }




import { Document, Model } from "mongoose";

export type AuthProvider = "local" | "google";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  password?: string; // Google user দের password থাকবে না, তাই optional
  role: "user" | "admin";
  phoneNumber?: string;
  status: "active" | "blocked";

  avatar?: {
    public_id?: string;
    url: string;
  };

  shippingAddress?: {
    addressLine?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;

    // --- নতুন ---
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  refreshToken?: string;

  authProvider: AuthProvider;
  googleId?: string;

  createdAt: Date;
  updatedAt: Date;

  createVerificationToken(): string;
    createResetPasswordToken(): string; 
}

export interface IUserModel extends Model<IUser> {
  isPasswordMatched(password: string, hashedPassword: string): Promise<boolean>;
}