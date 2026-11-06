import express from "express";
import {
  updateShippingConfig,
  getAllShippingConfigs,
  getShippingConfigByType,
  deleteShippingConfig,
  previewShippingCharge,
  getDeliverySettings,
  updateDeliverySettings,
} from "./shipping.controller";
import { isAuthenticated, isAdmin } from "../../middlewares/auth.middleware";

const router = express.Router();

// Public: Shipping Settings & Preview
router.get("/settings", getDeliverySettings);
router.get("/preview", previewShippingCharge);

// Admin: Base location & Delivery charge settings
router.post("/admin/settings", updateDeliverySettings);
router.get("/admin/all", getAllShippingConfigs);
router.post("/admin/update", updateShippingConfig);
router.delete("/admin/:type", deleteShippingConfig);

// Public type config
router.get("/:type", getShippingConfigByType);

export const ShippingRoutes = router;
