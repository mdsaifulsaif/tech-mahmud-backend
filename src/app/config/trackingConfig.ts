// src/config/trackingConfig.ts
// Database-driven configuration with in-memory caching for Meta CAPI, GTM, GA4, and TikTok
import { MarketingSetting } from "../modules/settings/marketingSetting.model";

export interface ITrackingProviderConfig {
  facebook: {
    isEnabled: boolean;
    pixelId: string;
    accessToken: string;
    apiVersion: string;
    testEventCode?: string;
  };
  tiktok: {
    isEnabled: boolean;
    pixelCode: string;
    accessToken: string;
    apiVersion: string;
  };
  ga4: {
    isEnabled: boolean;
    measurementId: string;
    apiSecret: string;
  };
  gtm: {
    isEnabled: boolean;
    containerId: string;
  };
}

let cachedConfig: ITrackingProviderConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

export async function getTrackingConfig(): Promise<ITrackingProviderConfig> {
  const now = Date.now();
  if (cachedConfig && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const doc: any = await MarketingSetting.findOne().lean();
    if (doc) {
      cachedConfig = {
        facebook: {
          isEnabled: Boolean(doc.meta?.isEnabled),
          pixelId: doc.meta?.pixelId || "",
          accessToken: doc.meta?.accessToken || "",
          apiVersion: "v21.0",
          testEventCode: doc.meta?.testEventCode || undefined,
        },
        tiktok: {
          isEnabled: Boolean(doc.tiktok?.isEnabled),
          pixelCode: doc.tiktok?.pixelCode || "",
          accessToken: doc.tiktok?.accessToken || "",
          apiVersion: "v1.3",
        },
        ga4: {
          isEnabled: Boolean(doc.ga4?.isEnabled),
          measurementId: doc.ga4?.measurementId || "",
          apiSecret: doc.ga4?.apiSecret || "",
        },
        gtm: {
          isEnabled: Boolean(doc.gtm?.isEnabled),
          containerId: doc.gtm?.containerId || "",
        },
      };
      lastFetchTime = now;
      return cachedConfig;
    }
  } catch (error: any) {
    console.error(
      "[Tracking] Error retrieving marketing settings from DB:",
      error?.message
    );
  }

  const fallback: ITrackingProviderConfig = {
    facebook: {
      isEnabled: false,
      pixelId: "",
      accessToken: "",
      apiVersion: "v21.0",
      testEventCode: undefined,
    },
    tiktok: {
      isEnabled: false,
      pixelCode: "",
      accessToken: "",
      apiVersion: "v1.3",
    },
    ga4: {
      isEnabled: false,
      measurementId: "",
      apiSecret: "",
    },
    gtm: {
      isEnabled: false,
      containerId: "",
    },
  };

  cachedConfig = fallback;
  lastFetchTime = now;
  return fallback;
}

export function invalidateTrackingConfigCache(): void {
  cachedConfig = null;
  lastFetchTime = 0;
}

export const trackingConfig = {
  get facebook() {
    return (
      cachedConfig?.facebook || {
        isEnabled: false,
        pixelId: "",
        accessToken: "",
        apiVersion: "v21.0",
        testEventCode: undefined,
      }
    );
  },
  get tiktok() {
    return (
      cachedConfig?.tiktok || {
        isEnabled: false,
        pixelCode: "",
        accessToken: "",
        apiVersion: "v1.3",
      }
    );
  },
  get ga4() {
    return (
      cachedConfig?.ga4 || {
        isEnabled: false,
        measurementId: "",
        apiSecret: "",
      }
    );
  },
  get gtm() {
    return (
      cachedConfig?.gtm || {
        isEnabled: false,
        containerId: "",
      }
    );
  },
};

