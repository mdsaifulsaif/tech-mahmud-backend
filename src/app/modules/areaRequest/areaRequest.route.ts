import express from "express";
import { AreaRequestControllers } from "./areaRequest.controller";

const router = express.Router();

// Public: Submit a new area request
router.post("/", AreaRequestControllers.createAreaRequest);

// Admin: Overview stats
router.get("/stats", AreaRequestControllers.getAreaRequestStats);

// Admin: Get all requests with filters & search
router.get("/", AreaRequestControllers.getAllAreaRequests);

// Admin: Update status / notes
router.patch("/:id/status", AreaRequestControllers.updateAreaRequestStatus);
router.patch("/:id", AreaRequestControllers.updateAreaRequestStatus);

// Admin: Delete request
router.delete("/:id", AreaRequestControllers.deleteAreaRequest);

export const AreaRequestRoutes = router;
