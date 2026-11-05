export interface ITrackingUserData {
  email?: string;
  phone?: string;
  externalId?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
  ttclid?: string;
  gaClientId?: string;
}

export interface ITrackingItem {
  id: string;
  quantity: number;
  price?: number;
  itemName?: string;
}

export interface ITrackingCustomData {
  currency?: string;
  value?: number;
  contentIds?: string[];
  contentType?: string;
  contents?: ITrackingItem[];
  orderId?: string;
  numItems?: number;
  searchString?: string;
}

export interface TrackingEventPayload {
  eventName: string;
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string;
  actionSource?: string;
  userData: ITrackingUserData;
  customData?: ITrackingCustomData;
}

export interface ProviderDispatchResult {
  provider: "facebook" | "tiktok" | "ga4" | string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

