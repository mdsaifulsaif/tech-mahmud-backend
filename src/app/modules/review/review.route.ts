import { Router } from "express";
import { ReviewControllers } from "./review.controller";
import { isAuthenticated } from "../../middlewares/auth.middleware";

const router = Router();

// dashboard status route
router.get("/stats", ReviewControllers.getReviewDashboard);

// review status change route
router.patch("/:id/status", ReviewControllers.changeReviewStatus);

// review add korar route
router.post("/add-review", isAuthenticated, ReviewControllers.createReview);

// ✅ Get featured reviews (Home Page)
router.get("/featured", ReviewControllers.getFeaturedReviews);






// Toggle featured status
router.patch("/admin/:id/featured", isAuthenticated,  ReviewControllers.toggleFeatured);


// all review
router.get("/", ReviewControllers.getReviews);

// prodcut by route
router.get("/:id", ReviewControllers.getProductReviews);

// review reply
router.post("/:id/reply", ReviewControllers.addAdminReply);

// review delete
router.delete("/:id", ReviewControllers.deleteReview);

export const ReviewRoutes = router;
