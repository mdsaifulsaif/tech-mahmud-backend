import express from "express";
import { DashboardControllers } from "./dashboard.controller";
// import { isAuthenticated, isAdmin } from "../../middlewares/auth";

const router = express.Router();

router.get(
  "/stats",
  // isAuthenticated,
  // isAdmin,
  DashboardControllers.getDashboardStats,
);

export const DashboardRoutes = router;




// GET {{base_url}}/v1/dashboard/stats?range=7days
// GET {{base_url}}/v1/dashboard/stats?range=today
// GET {{base_url}}/v1/dashboard/stats?range=30days
// GET {{base_url}}/v1/dashboard/stats?range=year