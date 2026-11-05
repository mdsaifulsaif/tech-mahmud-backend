import { TrackingEventModel } from "../trackingEvent.model";
import { sendToFacebookCapi } from "./fbCapi.service";
import { sendToGa4 } from "./ga4.service";
import { sendToTikTokEvents } from "./tiktokEvents.service";
import { ProviderDispatchResult, TrackingEventPayload } from "../tracking.interface";

export async function dispatchTrackingEvent(
  payload: TrackingEventPayload
): Promise<ProviderDispatchResult[]> {
  const results = await Promise.allSettled([
    sendToFacebookCapi(payload),
    sendToTikTokEvents(payload),
    sendToGa4(payload),
  ]);

  const providerResults: ProviderDispatchResult[] = results.map((r, idx) => {
    if (r.status === "fulfilled") return r.value;
    const providers = ["facebook", "tiktok", "ga4"];
    return { provider: providers[idx], success: false, error: String(r.reason) };
  });

  try {
    await TrackingEventModel.create({
      eventId: payload.eventId,
      eventName: payload.eventName,
      orderId: payload.customData?.orderId,
      userIdentifier: payload.userData.externalId,
      providers: providerResults.map((r) => ({
        provider: r.provider,
        success: r.success,
        statusCode: r.statusCode,
        error: r.error,
        sentAt: new Date(),
      })),
      rawPayload: payload,
    });
  } catch (err: any) {
    if (err.code !== 11000) {
      console.error("[Tracking] Log save failed:", err.message);
    }
  }

  return providerResults;
}

