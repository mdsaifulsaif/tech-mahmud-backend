import { Schema, model } from "mongoose";
import { IBanner } from "./banner.interface";

const bannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      required: [true, "Banner image is required"],
      trim: true,
    },
    mobileImage: {
      type: String,
      trim: true,
      default: "",
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    placement: {
      type: String,
      enum: [
        "slider",
        "side_top",
        "side_middle",
        "side_bottom",
        "festive_1",
        "festive_2",
        "festive_3",
        "popup",
      ],
      default: "slider",
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bannerSchema.index({ isActive: 1, isDeleted: 1, order: 1 });

export const Banner = model<IBanner>("Banner", bannerSchema);
