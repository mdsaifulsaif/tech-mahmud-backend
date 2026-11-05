import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { dispatchTrackingEvent } from "./services/eventDispatcher.service";
import { TrackingEventModel } from "./trackingEvent.model";
import { TrackingEventPayload } from "./tracking.interface";

export async function trackEventHandler(req: Request, res: Response) {
  try {
    const body = req.body;
    if (!body.eventName) {
      return res
        .status(400)
        .json({ success: false, message: "eventName is required" });
    }

    const payload: TrackingEventPayload = {
      eventName: body.eventName,
      eventId: body.eventId || randomUUID(),
      eventSourceUrl: body.eventSourceUrl || "https://sobjihaat.com",
      actionSource: body.actionSource || "website",
      userData: {
        email: body.email,
        phone: body.phone,
        externalId: body.userId,
        clientIpAddress: req.ip,
        clientUserAgent: req.headers["user-agent"],
        fbc: req.cookies?._fbc,
        fbp: req.cookies?._fbp,
        ttclid: body.ttclid,
        gaClientId: body.gaClientId,
      },
      customData: body.customData,
    };

    const results = await dispatchTrackingEvent(payload);
    return res
      .status(200)
      .json({ success: true, eventId: payload.eventId, providers: results });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getTrackingEventsHandler(req: Request, res: Response) {
  try {
    const limit = Number(req.query.limit) || 30;
    const events = await TrackingEventModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Tracking logs retrieved successfully",
      data: events,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function testTrackingEventHandler(req: Request, res: Response) {
  try {
    const testPayload: TrackingEventPayload = {
      eventName: req.body.eventName || "PageView",
      eventId: `test-${randomUUID()}`,
      eventSourceUrl: req.body.eventSourceUrl || "https://sobjihaat.com/test",
      actionSource: "website",
      userData: {
        email: "test@sobjihaat.com",
        phone: "01700000000",
        externalId: "test-admin-user",
        clientIpAddress: req.ip || "127.0.0.1",
        clientUserAgent: req.headers["user-agent"] || "Admin-Tester",
      },
      customData: {
        currency: "BDT",
        value: 100,
        contentIds: ["test-item-1"],
        orderId: `TEST-ORD-${Date.now().toString().slice(-6)}`,
      },
    };

    const results = await dispatchTrackingEvent(testPayload);
    return res.status(200).json({
      success: true,
      message: "Test event dispatched to configured marketing providers",
      eventId: testPayload.eventId,
      providers: results,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

