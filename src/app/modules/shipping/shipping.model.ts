import { Schema, model } from "mongoose";
import { IShippingConfig } from "./shipping.interface";

const shippingTierSchema = new Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    charge: { type: Number, required: true },
  },
  { _id: false }
);

const shippingConfigSchema = new Schema<IShippingConfig>(
  {
    type: {
      type: String,
      enum: ["local", "nationwide"],
      required: true,
      unique: true,
    },
    tiers: { type: [shippingTierSchema], required: true, default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ShippingConfig = model<IShippingConfig>(
  "ShippingConfig",
  shippingConfigSchema
);
