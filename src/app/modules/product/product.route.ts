import { Router } from "express";
import { ProductControllers } from "./product.controller";
import { isAuthenticated, isAdmin } from "../../middlewares/auth.middleware";
import { upload } from "../../middlewares/multer.middleware";

const router = Router();

router.post(
  "/create-product",
  // isAuthenticated,
  // isAdmin,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  ProductControllers.createProduct,
);

router.patch("/:id/toggle-flag", ProductControllers.toggleProductFlag);

router.patch(
  "/:id",
  // isAuthenticated,
  // isAdmin,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  ProductControllers.updateProduct,
);

router.get("/category/:slug", ProductControllers.getProductsByCategorySlug);

router.get("/", ProductControllers.getAllProducts);

router.delete(
  "/:id",
  isAuthenticated,
  isAdmin,
  ProductControllers.deleteProduct,
);

router.get("/related-products", ProductControllers.getRelatedProducts);
router.get("/low-stock", ProductControllers.getLowStockProducts);

// Get featured products (home page)
router.get("/featured", ProductControllers.getFeaturedProducts);

// Get new collection products (home page)
router.get("/new-collection", ProductControllers.getNewCollectionProducts);

// Get trending products (home page)
router.get("/trending", ProductControllers.getTrendingProducts);

router.get("/:id", ProductControllers.getSingleProduct);

export const ProductRoutes = router;
