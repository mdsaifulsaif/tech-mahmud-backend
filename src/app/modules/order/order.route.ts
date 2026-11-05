// order.route.ts
import { Router } from "express";
import { editOrder, getOrderDetails, OrderControllers } from "./order.controller";
import { isAuthenticated, isAdmin } from "../../middlewares/auth.middleware";

const router = Router();

// User routes
router.post("/place-order", isAuthenticated, OrderControllers.createOrder);
router.get("/my-orders", isAuthenticated, OrderControllers.getMyOrders);
router.get("/my-orders/:id", isAuthenticated, OrderControllers.getSingleOrder);
router.patch("/cancel/:id", isAuthenticated, OrderControllers.cancelOrder);
router.get("/track/:orderNumber", OrderControllers.trackOrderPublic);

// Admin routes
router.get(
  "/admin/all",
  isAuthenticated,
  isAdmin,
  OrderControllers.getAllOrders
);

router.post("/admin/create", isAuthenticated, OrderControllers.adminCreateOrder);

router.get(
  "/admin/stats",
  isAuthenticated,
  isAdmin,
  OrderControllers.getOrderStats
);

router.patch(
  "/admin/status/:id",
  isAuthenticated,
  isAdmin,
  OrderControllers.updateOrderStatus
);

router.patch(
  "/admin/:id/courier",
  isAuthenticated,
  isAdmin,
  OrderControllers.updateCourierInfo
);

router.patch(
  "/admin/:id/payment",
  isAuthenticated,
  isAdmin,
  OrderControllers.updatePaymentStatus
);

router.patch(
  "/admin/:id/note",
  isAuthenticated,
  isAdmin,
  OrderControllers.addAdminNote
);

router.patch(
  "/admin/return/:id",
  isAuthenticated,
  isAdmin,
  OrderControllers.processReturn
);

router.get("/admin/details/:orderID", isAuthenticated, getOrderDetails);
router.get("/details/:orderID", isAuthenticated, getOrderDetails);
router.patch("/admin/edit/:orderID", isAuthenticated, editOrder);

export const OrderRoutes = router;
