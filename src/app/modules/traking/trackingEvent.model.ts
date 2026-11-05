// src/models/trackingEvent.model.ts
import { Schema, model } from "mongoose";

const trackingEventSchema = new Schema(
  {
    eventId: { type: String, required: true },
    eventName: { type: String, required: true },
    orderId: { type: String, index: true },
    userIdentifier: { type: String },
    providers: [
      {
        provider: {
          type: String,
          enum: ["facebook", "tiktok", "ga4"],
          required: true,
        },
        success: { type: Boolean, required: true },
        statusCode: { type: Number },
        error: { type: String },
        sentAt: { type: Date, default: Date.now },
      },
    ],
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

trackingEventSchema.index({ eventId: 1 }, { unique: true });

export const TrackingEventModel = model("TrackingEventLog", trackingEventSchema);

