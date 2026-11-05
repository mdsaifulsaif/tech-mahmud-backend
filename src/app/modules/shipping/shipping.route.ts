import express from "express";
import {
  updateShippingConfig,
  getAllShippingConfigs,
  getShippingConfigByType,
  deleteShippingConfig,
  previewShippingCharge,
} from "./shipping.controller";
import { isAuthenticated } from "../../middlewares/auth.middleware";

const router = express.Router();

router.get("/preview", isAuthenticated, previewShippingCharge);

// Admin
router.get("/admin/all", getAllShippingConfigs);
router.post("/admin/update", updateShippingConfig);
router.delete("/admin/:type", deleteShippingConfig);

// Public
router.get("/:type", getShippingConfigByType);

export const ShippingRoutes = router;
