import express from "express";
import { UserControllers } from "./customer.controler";
import { isAdmin, isAuthenticated } from "../../middlewares/auth.middleware";

const router = express.Router();

// 1. Statistics routes (Must be defined before /:id routes)
router.get("/stats", isAuthenticated, isAdmin, UserControllers.getCustomerStats);
router.get("/admin/stats", isAuthenticated, isAdmin, UserControllers.getCustomerStats);

// 2. Customer list routes
router.get("/", isAuthenticated, isAdmin, UserControllers.getAllCustomers);
router.get("/admin/all", isAuthenticated, isAdmin, UserControllers.getAllCustomers);

// 3. Customer detail routes
router.get("/admin/:id", isAuthenticated, isAdmin, UserControllers.getSingleCustomer);
router.get("/:id", isAuthenticated, isAdmin, UserControllers.getSingleCustomer);

// 4. Update status & profile routes
router.patch("/:id/status", isAuthenticated, isAdmin, UserControllers.toggleCustomerStatus);
router.patch("/admin/:id", isAuthenticated, isAdmin, UserControllers.updateCustomer);
router.patch("/:id", isAuthenticated, isAdmin, UserControllers.updateCustomer);

// 5. Delete routes
router.delete("/admin/:id", isAuthenticated, isAdmin, UserControllers.deleteCustomer);
router.delete("/:id", isAuthenticated, isAdmin, UserControllers.deleteCustomer);

export const CustomerRoutes = router;