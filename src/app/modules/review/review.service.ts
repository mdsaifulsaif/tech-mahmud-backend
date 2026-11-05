import mongoose from "mongoose";
import { IReview } from "./review.interface";
import { Review } from "./review.model";

const syncProductRating = async (productId: string | mongoose.Types.ObjectId) => {
  const prodId = typeof productId === "string" ? new mongoose.Types.ObjectId(productId) : productId;
  const stats = await Review.aggregate([
    { $match: { productID: prodId, status: "approved" } },
    {
      $group: {
        _id: "$productID",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Product").findByIdAndUpdate(prodId, {
      rating: Number(stats[0].avgRating.toFixed(1)),
      numReviews: stats[0].totalReviews,
    });
  } else {
    await mongoose.model("Product").findByIdAndUpdate(prodId, {
      rating: 0,
      numReviews: 0,
    });
  }
};

const addReviewToDB = async (payload: IReview) => {
  const alreadyReviewed = await Review.findOne({
    productID: payload.productID,
    userID: payload.userID,
  });

  if (alreadyReviewed) {
    throw new Error("You have already submitted a review for this product!");
  }

  // Auto-approve review so user immediately sees their rating and reviews count
  const result = await Review.create({
    ...payload,
    status: "approved",
  });

  // Immediately sync product rating in DB
  await syncProductRating(result.productID);

  return result;
};

const getAllReviewsFromDB = async (page: number, limit: number, status?: string) => {
  const skip = (page - 1) * limit;
  const filter = status && status !== "all" ? { status } : {};

  const result = await Review.find(filter)
    .populate("userID", "firstName lastName email avatar") 
    .populate("productID", "name thumbnail")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments(filter);
  const totalPage = Math.ceil(total / limit);

  return { meta: { page, limit, total, totalPage }, data: result };
};

const getReviewsByProductIdFromDB = async (
  productId: string,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;
  const prodObjId = new mongoose.Types.ObjectId(productId);

  const filter = { productID: productId, status: "approved" };

  const data = await Review.find(filter)
    .populate('userID', 'firstName lastName avatar')
    .populate('productID', 'name thumbnail')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments(filter);
  const totalPage = Math.ceil(total / limit);

  // Calculate rating stats for breakdown and average
  const ratingAgg = await Review.aggregate([
    { $match: { productID: prodObjId, status: "approved" } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);

  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sumRating = 0;
  let totalRatingCount = 0;

  ratingAgg.forEach((item: any) => {
    const star = Number(item._id);
    const count = Number(item.count);
    if (star >= 1 && star <= 5) {
      ratingCounts[star] = count;
      sumRating += star * count;
      totalRatingCount += count;
    }
  });

  const averageRating = totalRatingCount > 0 ? Number((sumRating / totalRatingCount).toFixed(1)) : 0;

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
      averageRating,
      ratingCounts,
    },
    data,
  };
};

// for admin 
const getReviewStatsFromDB = async () => {
  const stats = await Review.aggregate([
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        avgRating: { $avg: "$rating" },
        approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
      },
    },
  ]);
  return stats[0] || { totalReviews: 0, avgRating: 0, approved: 0, pending: 0 };
};


const updateReviewStatusDB = async (id: string, status: string) => {
  const review = await Review.findById(id);
  if (!review) throw new Error("Review not found");

  review.status = status as "pending" | "approved" | "rejected";
  await review.save();
  await syncProductRating(review.productID);

  return review;
};

const addAdminReplyToDB = async (id: string, reply: string) => {
  const result = await Review.findByIdAndUpdate(
    id,
    { adminReply: reply },
    { new: true }
  );
  return result;
};

const deleteReviewFromDB = async (id: string) => {
  const review = await Review.findById(id);
  if (!review) return null;
  const prodId = review.productID;
  const result = await Review.findByIdAndDelete(id);
  if (prodId) {
    await syncProductRating(prodId);
  }
  return result;
};


// ✅ Get Featured Reviews (Public)
const getFeaturedReviewsFromDB = async (limit: number = 6) => {
  const result = await Review.find({
    isFeatured: true,
    status: "approved",
  })
    .populate("userID", "firstName lastName avatar")
    .populate("productID", "name thumbnail slug")
    .sort({ featuredAt: -1, createdAt: -1 })
    .limit(limit);

  return result;
};

// ✅ Toggle Featured Status (Admin)
const toggleFeaturedReviewDB = async (id: string) => {
  const review = await Review.findById(id);
  if (!review) {
    throw new Error("Review not found!");
  }

  // Toggle isFeatured
  const newFeaturedStatus = !review.isFeatured;
  
  const result = await Review.findByIdAndUpdate(
    id,
    {
      isFeatured: newFeaturedStatus,
      featuredAt: newFeaturedStatus ? new Date() : null,
    },
    { new: true }
  );

  return result;
};



export const ReviewServices = {
  addReviewToDB,
  getAllReviewsFromDB,
  getReviewsByProductIdFromDB,
  getReviewStatsFromDB,
  updateReviewStatusDB,
  addAdminReplyToDB,
  deleteReviewFromDB,
  getFeaturedReviewsFromDB,
  toggleFeaturedReviewDB 
};
