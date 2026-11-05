import { Schema, model } from "mongoose";
import { IAreaRequest } from "./areaRequest.interface";

const areaRequestSchema = new Schema<IAreaRequest>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    areaName: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      default: "Barishal",
    },
    district: {
      type: String,
      trim: true,
      default: "Barishal",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "approved", "rejected"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for efficient search and filtering
areaRequestSchema.index({ areaName: "text", name: "text", phone: "text" });

export const AreaRequest = model<IAreaRequest>("AreaRequest", areaRequestSchema);
