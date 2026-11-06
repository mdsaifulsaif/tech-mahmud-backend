import { Schema, model } from "mongoose";
import { IShippingConfig, IDeliverySettings } from "./shipping.interface";

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

const deliverySettingsSchema = new Schema<IDeliverySettings>(
  {
    baseLocation: { type: String, default: "Barisal", required: true },
    insideCharge: { type: Number, default: 60, required: true },
    outsideCharge: { type: Number, default: 150, required: true },
    insideEstimatedDays: { type: String, default: "24 - 48 Hours" },
    outsideEstimatedDays: { type: String, default: "2 - 4 Days" },
    isFreeShippingActive: { type: Boolean, default: false },
    freeShippingMinAmount: { type: Number, default: 2000 },
    isStorePickupActive: { type: Boolean, default: true },
    storePickupAddress: {
      type: String,
      default: "Tech Mahmud Main Store, Sadar Road, Barisal",
    },
    storePickupCharge: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DeliverySettings = model<IDeliverySettings>(
  "DeliverySettings",
  deliverySettingsSchema
);

export const ShippingConfig = model<IShippingConfig>(
  "ShippingConfig",
  shippingConfigSchema
);
