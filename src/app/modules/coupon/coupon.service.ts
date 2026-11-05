import { Types } from "mongoose";
import { ICoupon } from "./coupon.interface";
import { Coupon } from "./coupon.model";
import { Order } from "../order/order.model";
import { Product } from "../product/product.model";

export interface ICartItemForCoupon {
  productID: string | Types.ObjectId;
  variantID?: string | Types.ObjectId | null;
  quantity: number;
  unitPrice?: number;
  salePrice?: number;
  totalPrice?: number;
  categoryID?: string | Types.ObjectId;
}

/**
 * Create a new coupon
 */
const createCouponToDB = async (payload: Partial<ICoupon>) => {
  const code = (payload.code || "").trim().toUpperCase();
  const existing = await Coupon.findOne({ code });
  if (existing) {
    const error: any = new Error("Coupon with this code already exists");
    error.statusCode = 400;
    throw error;
  }

  const result = await Coupon.create({
    ...payload,
    code,
  });
  return result;
};

/**
 * Get all coupons for Admin with search & pagination
 */
const getAllCouponsFromDB = async (query: Record<string, any> = {}) => {
  const {
    search,
    searchTerm,
    status,
    page = 1,
    limit = 100,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 100);
  const skip = (pageNum - 1) * limitNum;

  const filter: any = {};
  const searchStr = (searchTerm || search || "").trim();
  if (searchStr) {
    filter.$or = [
      { code: { $regex: searchStr, $options: "i" } },
      { name: { $regex: searchStr, $options: "i" } },
    ];
  }

  if (status === "active") {
    filter.isActive = true;
  } else if (status === "inactive") {
    filter.isActive = false;
  }

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sortStage: any = {};
  sortStage[sortBy] = sortDirection;

  const [data, total] = await Promise.all([
    Coupon.find(filter)
      .populate("specificProducts", "name title")
      .populate("specificCategories", "name title")
      .populate("specificUsers", "firstName lastName email phoneNumber")
      .sort(sortStage)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Coupon.countDocuments(filter),
  ]);

  const totalPage = Math.ceil(total / limitNum) || 1;

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPage,
      totalPages: totalPage,
    },
    data,
  };
};

/**
 * Get active valid coupons for client / available coupons drawer
 */
const getActiveCouponsForClient = async (currentUserID?: string) => {
  const now = new Date();

  const filter: any = {
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  };

  if (currentUserID) {
    const userObjId = Types.ObjectId.isValid(currentUserID)
      ? new Types.ObjectId(currentUserID)
      : null;

    filter.$or = [
      { applicableTo: { $in: ["all", "specific_products", "specific_categories"] } },
      {
        applicableTo: "specific_users",
        specificUsers: userObjId ? { $in: [userObjId, currentUserID] } : currentUserID,
      },
    ];
  } else {
    // Guest users cannot see private user-specific coupons
    filter.applicableTo = { $in: ["all", "specific_products", "specific_categories"] };
  }

  const coupons = await Coupon.find(filter)
    .populate("specificProducts", "name title")
    .populate("specificCategories", "name title")
    .select(
      "code name description discountType discountValue maxDiscount minPurchase startDate endDate usageLimit usagePerUser usedCount applicableTo specificProducts specificCategories specificUsers"
    )
    .sort({ minPurchase: 1 })
    .lean();

  // Filter out those that exceeded global usageLimit
  return coupons.filter(
    (c) => !c.usageLimit || c.usageLimit === 0 || (c.usedCount || 0) < c.usageLimit
  );
};

/**
 * Get single coupon
 */
const getCouponByIdFromDB = async (id: string) => {
  const coupon = await Coupon.findById(id)
    .populate("specificProducts")
    .populate("specificCategories")
    .populate("specificUsers", "firstName lastName email phoneNumber")
    .lean();

  if (!coupon) {
    const error: any = new Error("Coupon not found");
    error.statusCode = 404;
    throw error;
  }
  return coupon;
};

/**
 * Update coupon
 */
const updateCouponInDB = async (id: string, payload: Partial<ICoupon>) => {
  if (payload.code) {
    payload.code = payload.code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: payload.code, _id: { $ne: id } });
    if (existing) {
      const error: any = new Error("Another coupon with this code already exists");
      error.statusCode = 400;
      throw error;
    }
  }

  const updated = await Coupon.findByIdAndUpdate(id, payload, { new: true });
  if (!updated) {
    const error: any = new Error("Coupon not found");
    error.statusCode = 404;
    throw error;
  }
  return updated;
};

/**
 * Delete coupon
 */
const deleteCouponFromDB = async (id: string) => {
  const deleted = await Coupon.findByIdAndDelete(id);
  if (!deleted) {
    const error: any = new Error("Coupon not found");
    error.statusCode = 404;
    throw error;
  }
  return deleted;
};

/**
 * Validate and calculate coupon discount with Category, Product, and User scoping
 */
const validateAndCalculateCoupon = async (
  code: string,
  subtotal: number,
  userID?: string,
  items?: ICartItemForCoupon[]
) => {
  const cleanCode = (code || "").trim().toUpperCase();
  if (!cleanCode) {
    const error: any = new Error("Please enter a coupon code");
    error.statusCode = 400;
    throw error;
  }

  const coupon = await Coupon.findOne({ code: cleanCode })
    .populate("specificProducts", "name title")
    .populate("specificCategories", "name title")
    .populate("specificUsers", "firstName lastName email phoneNumber");

  if (!coupon) {
    const error: any = new Error(`Coupon "${cleanCode}" is invalid`);
    error.statusCode = 404;
    throw error;
  }

  if (!coupon.isActive) {
    const error: any = new Error(`Coupon "${cleanCode}" is currently inactive`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    const error: any = new Error(`Coupon "${cleanCode}" has not started yet`);
    error.statusCode = 400;
    throw error;
  }

  if (coupon.endDate && new Date(coupon.endDate) < now) {
    const error: any = new Error(`Coupon "${cleanCode}" has expired`);
    error.statusCode = 400;
    throw error;
  }

  if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    const error: any = new Error(`Coupon "${cleanCode}" usage limit has been reached`);
    error.statusCode = 400;
    throw error;
  }

  // 1. Specific Users Restriction Check
  const isUserSpecific =
    coupon.applicableTo === "specific_users" ||
    (coupon.specificUsers && coupon.specificUsers.length > 0);

  if (isUserSpecific) {
    if (!userID) {
      const error: any = new Error(
        `Please log in to your account to use coupon "${cleanCode}". This is reserved for selected members.`
      );
      error.statusCode = 401;
      throw error;
    }
    const isAllowedUser = (coupon.specificUsers || []).some((uId: any) => {
      const idStr = (uId?._id || uId)?.toString();
      return idStr === userID.toString();
    });
    if (!isAllowedUser) {
      const error: any = new Error(
        `Coupon "${cleanCode}" is exclusively reserved for selected customers.`
      );
      error.statusCode = 403;
      throw error;
    }
  }

  // 2. Per-user usage limit check
  if (userID && coupon.usagePerUser && coupon.usagePerUser > 0) {
    const userUsageCount = await Order.countDocuments({
      userID: new Types.ObjectId(userID),
      couponCode: cleanCode,
      status: { $ne: "cancelled" },
    });

    if (userUsageCount >= coupon.usagePerUser) {
      const error: any = new Error(
        `You have already used coupon "${cleanCode}" the maximum allowed times (${coupon.usagePerUser})`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // 3. Category / Product Scoping and Eligible Subtotal calculation
  let eligibleSubtotal = 0;
  let scopeDescription = "all items";

  if (coupon.applicableTo === "specific_categories") {
    const allowedCategoryIds = (coupon.specificCategories || []).map((c: any) =>
      (c._id || c).toString()
    );
    const categoryNames = (coupon.specificCategories || [])
      .map((c: any) => c.name || c.title || "Category")
      .join(", ");
    scopeDescription = categoryNames ? `selected categories (${categoryNames})` : "selected categories";

    if (!items || items.length === 0) {
      const error: any = new Error(
        `Coupon "${cleanCode}" is only applicable to products under: ${scopeDescription}. Your cart is empty.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Retrieve database product records to reliably get true categoryID for each item
    const productIds = items.map((it) => it.productID).filter(Boolean);
    const dbProducts = await Product.find({ _id: { $in: productIds } })
      .select("categoryID")
      .lean();

    const productCategoryMap: Record<string, string> = {};
    dbProducts.forEach((p) => {
      if (p.categoryID) {
        productCategoryMap[p._id.toString()] = p.categoryID.toString();
      }
    });

    // Check each cart item
    const matchingItems = items.filter((it) => {
      const dbCatId = productCategoryMap[it.productID?.toString()];
      const itemCatId = it.categoryID?.toString();
      return (
        (dbCatId && allowedCategoryIds.includes(dbCatId)) ||
        (itemCatId && allowedCategoryIds.includes(itemCatId))
      );
    });

    if (matchingItems.length === 0) {
      const error: any = new Error(
        `Coupon "${cleanCode}" is only applicable to: ${categoryNames || "specific categories"}. Your cart does not contain any eligible items.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Calculate eligible subtotal strictly on matching items
    eligibleSubtotal = matchingItems.reduce((sum, it) => {
      const itemTotal =
        it.totalPrice !== undefined
          ? it.totalPrice
          : (it.salePrice || it.unitPrice || 0) * (it.quantity || 1);
      return sum + itemTotal;
    }, 0);

    // Min purchase on eligible category items
    if (coupon.minPurchase && eligibleSubtotal < coupon.minPurchase) {
      const remaining = Math.round(coupon.minPurchase - eligibleSubtotal);
      const error: any = new Error(
        `Minimum order of ৳${coupon.minPurchase} required on ${categoryNames || "eligible category items"}. Add ৳${remaining} more of eligible items to apply.`
      );
      error.statusCode = 400;
      error.data = { remaining, minPurchase: coupon.minPurchase, eligibleSubtotal };
      throw error;
    }
  } else if (coupon.applicableTo === "specific_products") {
    const allowedProductIds = (coupon.specificProducts || []).map((p: any) =>
      (p._id || p).toString()
    );
    const productNames = (coupon.specificProducts || [])
      .map((p: any) => p.name || p.title || "Product")
      .join(", ");
    scopeDescription = productNames ? `selected products (${productNames})` : "selected products";

    if (!items || items.length === 0) {
      const error: any = new Error(
        `Coupon "${cleanCode}" is only applicable to specific items: ${scopeDescription}. Your cart is empty.`
      );
      error.statusCode = 400;
      throw error;
    }

    const matchingItems = items.filter((it) =>
      allowedProductIds.includes(it.productID?.toString())
    );

    if (matchingItems.length === 0) {
      const error: any = new Error(
        `Coupon "${cleanCode}" is only applicable to: ${productNames || "specific products"}. Your cart does not contain these items.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Calculate eligible subtotal strictly on matching products
    eligibleSubtotal = matchingItems.reduce((sum, it) => {
      const itemTotal =
        it.totalPrice !== undefined
          ? it.totalPrice
          : (it.salePrice || it.unitPrice || 0) * (it.quantity || 1);
      return sum + itemTotal;
    }, 0);

    // Min purchase on eligible products
    if (coupon.minPurchase && eligibleSubtotal < coupon.minPurchase) {
      const remaining = Math.round(coupon.minPurchase - eligibleSubtotal);
      const error: any = new Error(
        `Minimum order of ৳${coupon.minPurchase} required on eligible products. Add ৳${remaining} more of eligible items to apply.`
      );
      error.statusCode = 400;
      error.data = { remaining, minPurchase: coupon.minPurchase, eligibleSubtotal };
      throw error;
    }
  } else {
    // "all" or "specific_users" -> applies to entire cart
    eligibleSubtotal = subtotal;

    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      const remaining = Math.round(coupon.minPurchase - subtotal);
      const error: any = new Error(
        `Minimum order of ৳${coupon.minPurchase} required for "${cleanCode}". Add ৳${remaining} more to apply.`
      );
      error.statusCode = 400;
      error.data = { remaining, minPurchase: coupon.minPurchase };
      throw error;
    }
  }

  // 4. Calculate Discount strictly on eligibleSubtotal
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = Math.round((eligibleSubtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscount && coupon.maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    // Fixed / flat discount
    discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
  }

  const successMessage =
    coupon.applicableTo === "all" || coupon.applicableTo === "specific_users"
      ? `Coupon "${cleanCode}" applied! You saved ৳${discountAmount}`
      : `Coupon "${cleanCode}" applied! You saved ৳${discountAmount} on eligible items`;

  return {
    valid: true,
    couponCode: coupon.code,
    name: coupon.name,
    description: coupon.description,
    discountAmount,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minPurchase: coupon.minPurchase,
    maxDiscount: coupon.maxDiscount,
    applicableTo: coupon.applicableTo,
    eligibleSubtotal,
    message: successMessage,
  };
};

/**
 * Increment coupon used count upon successful order
 */
const incrementCouponUsage = async (code: string) => {
  if (!code) return;
  await Coupon.findOneAndUpdate(
    { code: code.toUpperCase() },
    { $inc: { usedCount: 1 } }
  );
};

export const CouponServices = {
  createCouponToDB,
  getAllCouponsFromDB,
  getActiveCouponsForClient,
  getCouponByIdFromDB,
  updateCouponInDB,
  deleteCouponFromDB,
  validateAndCalculateCoupon,
  incrementCouponUsage,
};
