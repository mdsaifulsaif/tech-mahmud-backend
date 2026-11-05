import mongoose, { Schema, model } from "mongoose";
import { IReview } from "./review.interface";

const reviewSchema = new Schema<IReview>(
  {
    productID: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
    adminReply: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
     isFeatured: {
      type: Boolean,
      default: false,
    },
    featuredAt: {
      type: Date,
      default: null,
    },
  },

  {
    timestamps: true,
    versionKey: "__v",
  },
);

// models/review.model.ts এ এই কোডটি যোগ করুন

reviewSchema.post("save", async function (doc, next) {
  // শুধুমাত্র এপ্রুভড রিভিউগুলো কাউন্ট হবে
  if (this.status === "approved") {
    const stats = await Review.aggregate([
      { $match: { productID: doc.productID, status: "approved" } },
      {
        $group: {
          _id: "$productID",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await mongoose.model("Product").findByIdAndUpdate(doc.productID, {
        rating: stats[0].avgRating.toFixed(1), // ১ দশমিক পর্যন্ত
        numReviews: stats[0].totalReviews,
      });
    }
  }
  next();
});

export const Review = model<IReview>("Review", reviewSchema);
