import axios from "axios";
import { getTrackingConfig } from "../../../config/trackingConfig";
import { ProviderDispatchResult, TrackingEventPayload } from "../tracking.interface";

const eventNameMap: Record<string, string> = {
  PageView: "page_view",
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
  CompleteRegistration: "sign_up",
  Search: "search",
  Lead: "generate_lead",
};

export async function sendToGa4(
  payload: TrackingEventPayload
): Promise<ProviderDispatchResult> {
  const config = await getTrackingConfig();
  const { isEnabled, measurementId, apiSecret } = config.ga4;

  if (!isEnabled) {
    return { provider: "ga4", success: false, error: "GA4 tracking is disabled" };
  }

  if (!measurementId || !apiSecret) {
    return {
      provider: "ga4",
      success: false,
      error: "GA4 measurementId/apiSecret missing in marketing settings",
    };
  }

  const clientId =
    payload.userData.gaClientId ||
    payload.userData.externalId ||
    payload.eventId;

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

  const ga4Payload = {
    client_id: clientId,
    events: [
      {
        name: eventNameMap[payload.eventName] || payload.eventName,
        params: {
          currency: payload.customData?.currency,
          value: payload.customData?.value,
          transaction_id: payload.customData?.orderId,
          items: payload.customData?.contents?.map((c) => ({
            item_id: c.id,
            item_name: c.itemName,
            quantity: c.quantity,
            price: c.price,
          })),
          search_term: payload.customData?.searchString,
        },
      },
    ],
  };

  try {
    const response = await axios.post(url, ga4Payload, { timeout: 5000 });
    return { provider: "ga4", success: true, statusCode: response.status };
  } catch (err: any) {
    return {
      provider: "ga4",
      success: false,
      statusCode: err?.response?.status,
      error: err?.response?.data?.message || err.message,
    };
  }
}

