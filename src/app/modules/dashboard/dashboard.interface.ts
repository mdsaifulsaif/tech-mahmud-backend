export interface IDashboardStats {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    totalRiders: number;
    changes: {
      revenue: number;
      orders: number;
      products: number;
      customers: number;
    };
  };
  alerts: {
    pendingOrders: number;
    lowStockProducts: number;
    pendingRiderApplications: number;
    onlineRiders: number;
    successRate: number;
  };
  revenueChart: {
    date: string;
    revenue: number;
    orders: number;
  }[];
  orderStatus: {
    [key: string]: { count: number; percent: number };
  };
  totalOrdersThisMonth: number;
  recentOrders: {
    orderNumber: string;
    customerName: string;
    amount: number;
    status: string;
    paymentMethod: string;
    createdAt: Date;
  }[];
  topProducts: {
    _id: string;
    productName: string;
    thumbnail: string;
    totalSold: number;
    totalRevenue: number;
  }[];
  topCategories: {
    _id: string;
    categoryName: string;
    totalSold: number;
    totalRevenue: number;
  }[];
  riderStats: {
    total: number;
    online: number;
    offline: number;
    busy: number;
    totalDeliveries: number;
  };
  recentRiderActivity: {
    riderName: string;
    phone: string;
    status: string;
    totalDeliveries: number;
    locationUpdatedAt?: Date;
  }[];
}