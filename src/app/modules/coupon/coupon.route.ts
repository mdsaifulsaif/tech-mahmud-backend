import { Router } from "express";
import { CouponControllers } from "./coupon.controller";
import { optionalAuth } from "../../middlewares/auth.middleware";

const router = Router();

// 1. Client available coupons endpoint (must be before /:id)
router.get("/available", optionalAuth, CouponControllers.getAvailableCoupons);

// 2. Validate & apply coupon
router.post("/apply", optionalAuth, CouponControllers.applyCoupon);

// 3. Admin list & create
router.get("/", CouponControllers.getAllCoupons);
router.post("/", CouponControllers.createCoupon);

// 4. Detail, update, delete
router.get("/:id", CouponControllers.getSingleCoupon);
router.patch("/:id", CouponControllers.updateCoupon);
router.delete("/:id", CouponControllers.deleteCoupon);

export const CouponRoutes = router;
