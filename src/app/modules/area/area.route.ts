import express from "express";
import { AreaControllers } from "./area.controller";
// import { isAuthenticated, isAdmin } from "../../middlewares/auth";

const router = express.Router();

router.get("/", AreaControllers.getAllAreas);

router.post(
  "/admin/create",
  // isAuthenticated, isAdmin,
  AreaControllers.createArea,
);
router.patch(
  "/admin/:id",
  // isAuthenticated, isAdmin,
  AreaControllers.updateArea,
);
router.get("/:id", AreaControllers.getSingleArea);
router.delete(
  "/admin/:id",
  // isAuthenticated, isAdmin,
  AreaControllers.deleteArea,
);

export const AreaRoutes = router;