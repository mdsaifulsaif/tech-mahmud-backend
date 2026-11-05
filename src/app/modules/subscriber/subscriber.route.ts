import { Router } from "express";
import { SubscriberControllers } from "./subscriber.controller";

const router = Router();

// Public: Subscribe email
router.post("/add", SubscriberControllers.subscribeEmail);

// Admin: Overview stats
router.get("/stats", SubscriberControllers.getSubscriberStats);

// Admin: Get all subscribers with filters and search
router.get("/", SubscriberControllers.getSubscribers);

// Admin: Update status (active / unsubscribed)
router.patch("/:id/status", SubscriberControllers.toggleSubscriberStatus);

// Admin: Delete subscriber
router.delete("/:id", SubscriberControllers.deleteSubscriber);

export const SubscriberRoutes = router;