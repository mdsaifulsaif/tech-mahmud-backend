import { Order } from "../order/order.model";
import { Product } from "../product/product.model";
import { User } from "../auth/user.model";
import { Category } from "../category/category.model";

const getDashboardStatsFromDB = async (query: any) => {
  const { range = "7days" } = query;

  // ===== Date range =====
  const now = new Date();
  let startDate = new Date();

  switch (range) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "7days":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30days":
      startDate.setDate(now.getDate() - 30);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear(), 0, 1);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }

  const dateFilter = { createdAt: { $gte: startDate, $lte: now } };

  const successStatuses = ["confirmed", "processing", "shipped", "out_for_delivery", "delivered"];

  // ===== 1. Revenue =====
  const [revenueResult, prevRevenueResult] = await Promise.all([
    Order.aggregate([
      { $match: { ...dateFilter, status: { $in: successStatuses } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate.getTime() - (now.getTime() - startDate.getTime())),
            $lt: startDate,
          },
          status: { $in: successStatuses },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  const totalRevenue = revenueResult[0]?.total || 0;
  const prevRevenue = prevRevenueResult[0]?.total || 0;

  // ===== 2. Orders, Customers, Products =====
  const periodLength = now.getTime() - startDate.getTime();
  const prevStart = new Date(startDate.getTime() - periodLength);

  const [
    totalOrders, prevOrders,
    totalProducts, prevProducts,
    totalCustomers, prevCustomers,
  ] = await Promise.all([
    Order.countDocuments(dateFilter),
    Order.countDocuments({ createdAt: { $gte: prevStart, $lt: startDate } }),
    Product.countDocuments({ isDeleted: { $ne: true } }),
    Product.countDocuments({ createdAt: { $lt: startDate }, isDeleted: { $ne: true } }),
    User.countDocuments({ role: "user", ...dateFilter }),
    User.countDocuments({ role: "user", createdAt: { $gte: prevStart, $lt: startDate } }),
  ]);

  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  };

  // ===== 3. Alerts =====
  const [
    pendingOrders,
    lowStockProducts,
    deliveredCount,
    cancelledCount,
  ] = await Promise.all([
    Order.countDocuments({ status: "pending" }),
    Product.countDocuments({
      isDeleted: { $ne: true },
      $expr: { $lte: ["$stock", "$lowStockAlert"] },
    }),
    Order.countDocuments({ ...dateFilter, status: "delivered" }),
    Order.countDocuments({ ...dateFilter, status: "cancelled" }),
  ]);

  const successRate = totalOrders > 0
    ? Math.round((deliveredCount / totalOrders) * 1000) / 10
    : 0;

  // ===== 4. Revenue Chart (daily) =====
  const revenueChart = await Order.aggregate([
    { $match: { ...dateFilter, status: { $in: successStatuses } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const formattedChart = revenueChart.map((item: any) => ({
    date: item._id,
    revenue: item.revenue,
    orders: item.orders,
  }));

  // ===== 5. Order Status distribution =====
  const orderStatusAggregation = await Order.aggregate([
    { $match: dateFilter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const defaultStatuses = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "returned",
  ];
  const orderStatus: { [key: string]: { count: number; percent: number } } = {};
  defaultStatuses.forEach((status) => {
    orderStatus[status] = { count: 0, percent: 0 };
  });

  orderStatusAggregation.forEach((item: any) => {
    if (item._id) {
      orderStatus[item._id] = {
        count: item.count,
        percent: totalOrders > 0 ? Math.round((item.count / totalOrders) * 1000) / 10 : 0,
      };
    }
  });

  // ===== 6. Orders this month =====
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalOrdersThisMonth = await Order.countDocuments({
    createdAt: { $gte: startOfMonth },
  });

  // ===== 7. Recent Orders =====
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("userID", "fullName firstName lastName email");

  const formattedRecentOrders = recentOrders.map((order: any) => ({
    orderNumber: order.orderNumber,
    customerName: order.userID?.fullName || order.userID?.firstName || "Guest",
    amount: order.totalAmount,
    status: order.status,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
  }));

  // ===== 8. Top Products & Categories =====
  const topProducts = await Order.aggregate([
    { $match: { ...dateFilter, status: { $in: successStatuses } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productID",
        productName: { $first: "$items.productName" },
        thumbnail: { $first: "$items.thumbnail" },
        totalSold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.totalPrice" },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
  ]);

  const topCategories = await Order.aggregate([
    { $match: { ...dateFilter, status: { $in: successStatuses } } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.productID",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categories",
        localField: "productInfo.categoryID",
        foreignField: "_id",
        as: "categoryInfo",
      },
    },
    { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$categoryInfo._id",
        categoryName: { $first: "$categoryInfo.name" },
        totalSold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.totalPrice" },
      },
    },
    { $match: { _id: { $ne: null } } },
    { $sort: { totalRevenue: -1 } },
    { $limit: 5 },
  ]);

  return {
    summary: {
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      totalRiders: 0,
      changes: {
        revenue: calcChange(totalRevenue, prevRevenue),
        orders: calcChange(totalOrders, prevOrders),
        products: calcChange(totalProducts, prevProducts),
        customers: calcChange(totalCustomers, prevCustomers),
      },
    },
    alerts: {
      pendingOrders,
      lowStockProducts,
      pendingRiderApplications: 0,
      onlineRiders: 0,
      successRate,
    },
    revenueChart: formattedChart,
    orderStatus,
    totalOrdersThisMonth,
    recentOrders: formattedRecentOrders,
    topProducts,
    topCategories,
    riderStats: {
      total: 0,
      online: 0,
      offline: 0,
      busy: 0,
      totalDeliveries: 0,
    },
    recentRiderActivity: [],
  };
};

export const DashboardServices = {
  getDashboardStatsFromDB,
};
