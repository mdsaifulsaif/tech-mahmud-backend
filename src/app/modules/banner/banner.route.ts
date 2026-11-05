import { Router } from "express";
import { BannerControllers } from "./banner.controller";
import { upload } from "../../middlewares/multer.middleware";

const router = Router();

// Public route for frontend
router.get("/", BannerControllers.getActiveBanners);

// Admin routes
router.get("/admin", BannerControllers.getAllBanners);
router.post("/", upload.single("image"), BannerControllers.createBanner);
router.get("/:id", BannerControllers.getBannerById);
router.patch("/:id", upload.single("image"), BannerControllers.updateBanner);
router.delete("/:id", BannerControllers.deleteBanner);

export const BannerRoutes = router;
