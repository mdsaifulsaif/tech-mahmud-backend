import { Router } from "express";
import {
  getTrackingEventsHandler,
  testTrackingEventHandler,
  trackEventHandler,
} from "./tracking.controller";

const router = Router();

router.post("/event", trackEventHandler);
router.get("/events", getTrackingEventsHandler);
router.post("/test", testTrackingEventHandler);

export const TrackingRoutes = router;

