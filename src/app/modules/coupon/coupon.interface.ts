import { Types } from "mongoose";

export type DiscountType = "percentage" | "fixed";
export type CouponApplicableTo = "all" | "specific_products" | "specific_categories" | "specific_users";

export interface ICoupon {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number;
  minPurchase: number;
  startDate: Date;
  endDate: Date;
  usageLimit: number; // 0 = unlimited
  usagePerUser: number; // default 1
  usedCount: number;
  applicableTo: CouponApplicableTo;
  specificProducts?: Types.ObjectId[];
  specificCategories?: Types.ObjectId[];
  specificUsers?: Types.ObjectId[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
