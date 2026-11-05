import { Types } from "mongoose";

export interface IReview {
  productID: Types.ObjectId;
  userID: Types.ObjectId;
  rating: number;
  comment: string;
  adminReply: string;
  status: "pending" | "approved" | "rejected";
  isFeatured?: boolean; // ✅ নতুন ফিল্ড
  featuredAt?: Date; // ✅ কখন Featured করা হয়েছে
}
