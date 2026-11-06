import { Schema, model } from "mongoose";
import { IBanner } from "./banner.interface";

const bannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    subtitle: {
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
    categoryID: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    categorySlug: {
      type: String,
      trim: true,
      default: "",
    },
    slot: {
      type: String,
      trim: true,
      default: "",
    },
    placement: {
      type: String,
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
