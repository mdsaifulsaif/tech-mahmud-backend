import express from "express";
import { SettingControllers } from "./setting.controller";
import { upload } from "../../middlewares/multer.middleware";

const router = express.Router();

// General Settings
router.get("/", SettingControllers.getSettings);
router.patch(
  "/update",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  SettingControllers.updateSettings
);

// Marketing & Tracking Settings
// Public endpoint for storefront script tags (Meta Pixel ID, GTM ID, GA4 ID, TikTok ID only)
router.get("/marketing/public", SettingControllers.getPublicMarketingSettings);

// Admin endpoints (full credentials including CAPI token, GA4 secret, etc.)
router.get("/marketing", SettingControllers.getMarketingSettings);
router.patch("/marketing", SettingControllers.updateMarketingSettings);

export const SettingRoutes = router;