import axios from "axios";
import { getTrackingConfig } from "../../../config/trackingConfig";
import { hashEmail, normalizeAndHashPhone } from "../../../utils/hash.util";
import { ProviderDispatchResult, TrackingEventPayload } from "../tracking.interface";

function sha256IfNeeded(value: string): string {
  const looksHashed = /^[a-f0-9]{64}$/i.test(value);
  return looksHashed ? value : hashEmail(value);
}

export async function sendToFacebookCapi(
  payload: TrackingEventPayload
): Promise<ProviderDispatchResult> {
  const config = await getTrackingConfig();
  const { isEnabled, pixelId, accessToken, apiVersion, testEventCode } =
    config.facebook;

  if (!isEnabled) {
    return {
      provider: "facebook",
      success: false,
      error: "Facebook tracking is disabled",
    };
  }

  if (!pixelId || !accessToken) {
    return {
      provider: "facebook",
      success: false,
      error: "FB pixelId/accessToken missing in marketing settings",
    };
  }

  const url = `https://graph.facebook.com/${apiVersion}/${pixelId}/events`;

  const fbPayload: any = {
    data: [
      {
        event_name: payload.eventName,
        event_time: payload.eventTime || Math.floor(Date.now() / 1000),
        event_id: payload.eventId,
        event_source_url: payload.eventSourceUrl,
        action_source: payload.actionSource || "website",
        user_data: {
          em: payload.userData.email ? [hashEmail(payload.userData.email)] : undefined,
          ph: payload.userData.phone
            ? [normalizeAndHashPhone(payload.userData.phone)]
            : undefined,
          external_id: payload.userData.externalId
            ? [sha256IfNeeded(payload.userData.externalId)]
            : undefined,
          client_ip_address: payload.userData.clientIpAddress,
          client_user_agent: payload.userData.clientUserAgent,
          fbc: payload.userData.fbc,
          fbp: payload.userData.fbp,
        },
        custom_data: payload.customData
          ? {
              currency: payload.customData.currency,
              value: payload.customData.value,
              content_ids: payload.customData.contentIds,
              content_type: payload.customData.contentType,
              contents: payload.customData.contents?.map((c) => ({
                id: c.id,
                quantity: c.quantity,
                item_price: c.price,
              })),
              order_id: payload.customData.orderId,
              num_items: payload.customData.numItems,
              search_string: payload.customData.searchString,
            }
          : undefined,
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  try {
    const response = await axios.post(url, fbPayload, {
      params: { access_token: accessToken },
      timeout: 10000,
    });
    return { provider: "facebook", success: true, statusCode: response.status };
  } catch (err: any) {
    return {
      provider: "facebook",
      success: false,
      statusCode: err?.response?.status,
      error: err?.response?.data?.error?.message || err.message,
    };
  }
}

