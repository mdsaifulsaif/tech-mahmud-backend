import { Types } from "mongoose";
import { IUser } from "../auth/user.interface";
import { User } from "../auth/user.model";
import { Order } from "../order/order.model";

/**
 * Get all customers with search, status filtering, pagination, and enriched order statistics
 */
const getAllCustomersFromDB = async (query: Record<string, any>) => {
  const {
    searchTerm,
    search,
    status,
    role,
    isVerified,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  // 1. Match Filter
  const matchStage: any = {};

  // Role: default to 'user' for customers (unless explicitly specified)
  const targetRole = role === "customer" || !role ? "user" : role;
  if (targetRole !== "all") {
    matchStage.role = targetRole;
  }

  // Search by firstName, lastName, fullName, email, phoneNumber
  const searchStr = (searchTerm || search || "").trim();
  if (searchStr) {
    matchStage.$or = [
      { firstName: { $regex: searchStr, $options: "i" } },
      { lastName: { $regex: searchStr, $options: "i" } },
      { fullName: { $regex: searchStr, $options: "i" } },
      { email: { $regex: searchStr, $options: "i" } },
      { phoneNumber: { $regex: searchStr, $options: "i" } },
    ];
  }

  // Status Filter (active / blocked)
  if (status && status !== "all") {
    matchStage.status = status;
  }

  // Email Verification Filter (since business relies on email verification)
  if (isVerified !== undefined && isVerified !== "all") {
    matchStage.isVerified = isVerified === "true" || isVerified === true;
  }

  // 2. Count total documents matching filter
  const total = await User.countDocuments(matchStage);
  const totalPage = Math.ceil(total / limitNum) || 1;

  // 3. Paginated Aggregation with Order Enriched Data (O(limit) lookup)
  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sortStage: any = {};
  sortStage[sortBy] = sortDirection;

  const customers = await User.aggregate([
    { $match: matchStage },
    { $sort: sortStage },
    { $skip: skip },
    { $limit: limitNum },
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "userID",
        as: "orderData",
      },
    },
    {
      $addFields: {
        totalOrders: {
          $size: {
            $filter: {
              input: "$orderData",
              as: "o",
              cond: { $ne: ["$$o.status", "cancelled"] },
            },
          },
        },
        totalSpent: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$orderData",
                  as: "o",
                  cond: { $ne: ["$$o.status", "cancelled"] },
                },
              },
              as: "vo",
              in: { $ifNull: ["$$vo.totalAmount", 0] },
            },
          },
        },
        lastOrderDate: {
          $max: "$orderData.createdAt",
        },
        // Frontend compatibility aliases
        phone: "$phoneNumber",
        addresses: {
          $cond: [
            {
              $and: [
                { $ne: ["$shippingAddress", null] },
                { $ne: ["$shippingAddress.city", ""] },
              ],
            },
            ["$shippingAddress"],
            [],
          ],
        },
      },
    },
    {
      $project: {
        password: 0,
        verificationToken: 0,
        verificationTokenExpires: 0,
        resetPasswordToken: 0,
        resetPasswordExpires: 0,
        refreshToken: 0,
        orderData: 0,
      },
    },
  ]);

  // 4. Global Stats for Overview Cards
  const stats = await getCustomerStatsFromDB();

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPage,
      totalPages: totalPage,
    },
    stats,
    data: customers,
  };
};

/**
 * Get aggregated customer statistics for Admin Cards
 */
const getCustomerStatsFromDB = async () => {
  const firstDayOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const statsAggregate = await User.aggregate([
    { $match: { role: "user" } },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        blockedUsers: {
          $sum: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] },
        },
        verifiedUsers: {
          $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] },
        },
        unverifiedUsers: {
          $sum: { $cond: [{ $eq: ["$isVerified", false] }, 1, 0] },
        },
        newThisMonth: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", firstDayOfMonth] }, 1, 0],
          },
        },
      },
    },
  ]);

  return (
    statsAggregate[0] || {
      totalCustomers: 0,
      totalUsers: 0,
      activeUsers: 0,
      blockedUsers: 0,
      verifiedUsers: 0,
      unverifiedUsers: 0,
      newThisMonth: 0,
    }
  );
};

/**
 * Get Single Customer with their order history
 */
const getSingleCustomerFromDB = async (id: string) => {
  const customer = await User.findById(id)
    .select(
      "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires -refreshToken"
    )
    .lean();

  if (!customer) {
    const error: any = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  // Fetch recent orders of this customer
  const orders = await Order.find({ userID: id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const totalOrders = await Order.countDocuments({
    userID: id,
    status: { $ne: "cancelled" },
  });

  const totalSpentResult = await Order.aggregate([
    {
      $match: {
        userID: new Types.ObjectId(id),
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: "$totalAmount" },
      },
    },
  ]);

  const totalSpent = totalSpentResult[0]?.totalSpent || 0;

  return {
    ...customer,
    phone: customer.phoneNumber,
    addresses: customer.shippingAddress ? [customer.shippingAddress] : [],
    totalOrders,
    totalSpent,
    orders,
  };
};

/**
 * Toggle or update customer status (active / blocked)
 */
const updateCustomerStatusInDB = async (
  id: string,
  status: "active" | "blocked"
): Promise<IUser | null> => {
  const updatedUser = await User.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  ).select(
    "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires -refreshToken"
  );

  if (!updatedUser) {
    const error: any = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  return updatedUser;
};

/**
 * Update Customer details from admin
 */
const updateCustomerInDB = async (id: string, payload: any) => {
  const allowedUpdates: Record<string, any> = {};

  if (payload.status) allowedUpdates.status = payload.status;
  if (payload.firstName) allowedUpdates.firstName = payload.firstName;
  if (payload.lastName) allowedUpdates.lastName = payload.lastName;
  if (payload.phoneNumber || payload.phone) {
    allowedUpdates.phoneNumber = payload.phoneNumber || payload.phone;
  }
  if (payload.isVerified !== undefined) {
    allowedUpdates.isVerified = Boolean(payload.isVerified);
  }
  if (payload.shippingAddress) {
    allowedUpdates.shippingAddress = payload.shippingAddress;
  }

  const updatedUser = await User.findByIdAndUpdate(id, allowedUpdates, {
    new: true,
    runValidators: true,
  }).select(
    "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires -refreshToken"
  );

  if (!updatedUser) {
    const error: any = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  return updatedUser;
};

/**
 * Delete Customer (with order integrity check)
 */
const deleteCustomerFromDB = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    const error: any = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  // Safety check: If user has orders, block instead of deleting to protect relational integrity
  const orderCount = await Order.countDocuments({ userID: id });
  if (orderCount > 0) {
    user.status = "blocked";
    await user.save();
    return {
      deleted: false,
      message:
        "Customer has past orders. To protect order history integrity, the customer was blocked instead of deleted.",
      user,
    };
  }

  await User.findByIdAndDelete(id);
  return {
    deleted: true,
    message: "Customer deleted successfully",
  };
};

export const UserServices = {
  getAllCustomersFromDB,
  getCustomerStatsFromDB,
  getSingleCustomerFromDB,
  updateCustomerStatusInDB,
  updateCustomerInDB,
  deleteCustomerFromDB,
};