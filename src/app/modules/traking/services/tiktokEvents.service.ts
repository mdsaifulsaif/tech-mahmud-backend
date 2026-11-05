import axios from "axios";
import { getTrackingConfig } from "../../../config/trackingConfig";
import { hashEmail, normalizeAndHashPhone } from "../../../utils/hash.util";
import { ProviderDispatchResult, TrackingEventPayload } from "../tracking.interface";

const eventNameMap: Record<string, string> = {
  PageView: "ViewContent",
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "CompletePayment",
  CompleteRegistration: "CompleteRegistration",
  Search: "Search",
  Lead: "SubmitForm",
};

export async function sendToTikTokEvents(
  payload: TrackingEventPayload
): Promise<ProviderDispatchResult> {
  const config = await getTrackingConfig();
  const { isEnabled, pixelCode, accessToken, apiVersion } = config.tiktok;

  if (!isEnabled) {
    return {
      provider: "tiktok",
      success: false,
      error: "TikTok tracking is disabled",
    };
  }

  if (!pixelCode || !accessToken) {
    return {
      provider: "tiktok",
      success: false,
      error: "TikTok pixelCode/accessToken missing in marketing settings",
    };
  }

  const url = `https://business-api.tiktok.com/open_api/${apiVersion}/event/track/`;

  const ttPayload = {
    pixel_code: pixelCode,
    event: eventNameMap[payload.eventName] || payload.eventName,
    event_id: payload.eventId,
    timestamp: new Date(
      (payload.eventTime || Math.floor(Date.now() / 1000)) * 1000
    ).toISOString(),
    context: {
      page: { url: payload.eventSourceUrl },
      user: {
        email: payload.userData.email ? hashEmail(payload.userData.email) : undefined,
        phone_number: payload.userData.phone
          ? normalizeAndHashPhone(payload.userData.phone)
          : undefined,
        external_id: payload.userData.externalId
          ? hashEmail(payload.userData.externalId)
          : undefined,
        ip: payload.userData.clientIpAddress,
        user_agent: payload.userData.clientUserAgent,
      },
      ad: payload.userData.ttclid ? { callback: payload.userData.ttclid } : undefined,
    },
    properties: payload.customData
      ? {
          currency: payload.customData.currency,
          value: payload.customData.value,
          content_type: payload.customData.contentType,
          contents: payload.customData.contents?.map((c) => ({
            content_id: c.id,
            quantity: c.quantity,
            price: c.price,
          })),
          order_id: payload.customData.orderId,
        }
      : undefined,
  };

  try {
    const response = await axios.post(url, ttPayload, {
      headers: {
        "Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });
    return { provider: "tiktok", success: true, statusCode: response.status };
  } catch (err: any) {
    return {
      provider: "tiktok",
      success: false,
      statusCode: err?.response?.status,
      error: err?.response?.data?.message || err.message,
    };
  }
}

