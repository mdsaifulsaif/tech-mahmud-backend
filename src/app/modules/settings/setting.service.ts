import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { Setting } from "./setting.model";
import { MarketingSetting } from "./marketingSetting.model";
import { invalidateTrackingConfigCache } from "../../config/trackingConfig";

const updateSettingsIntoDB = async (payload: any, files: any) => {
  const updateData = { ...payload };

  if (files) {
    if (files.logo && files.logo[0]) {
      const logoUpload: any = await uploadToCloudinary(
        files.logo[0].buffer, 
        "logos"
      );
      updateData.logo = logoUpload.url; 
    }

    if (files.favicon && files.favicon[0]) {
      const faviconUpload: any = await uploadToCloudinary(
        files.favicon[0].buffer,
        "favicons"
      );
      updateData.favicon = faviconUpload.url;
    }
  }

  if (payload.socialLinks && typeof payload.socialLinks === "string") {
    try {
      updateData.socialLinks = JSON.parse(payload.socialLinks);
    } catch (error) {
      console.log("Social Links JSON error");
    }
  }

  const result = await Setting.findOneAndUpdate(
    {}, 
    updateData, 
    {
      returnDocument: 'after', 
      upsert: true,
      runValidators: true,
    }
  );
  
  return result;
};

// ==================== Marketing & Analytics Settings ====================

const getMarketingSettingsFromDB = async () => {
  let settings = await MarketingSetting.findOne();
  if (!settings) {
    settings = await MarketingSetting.create({
      meta: { isEnabled: false, pixelId: "", accessToken: "", testEventCode: "" },
      gtm: { isEnabled: false, containerId: "" },
      ga4: { isEnabled: false, measurementId: "", apiSecret: "" },
      tiktok: { isEnabled: false, pixelCode: "", accessToken: "" },
    });
  }
  return settings;
};

const updateMarketingSettingsIntoDB = async (payload: any) => {
  const result = await MarketingSetting.findOneAndUpdate(
    {},
    {
      $set: {
        meta: {
          isEnabled: Boolean(payload.meta?.isEnabled),
          pixelId: payload.meta?.pixelId || "",
          accessToken: payload.meta?.accessToken || "",
          testEventCode: payload.meta?.testEventCode || "",
        },
        gtm: {
          isEnabled: Boolean(payload.gtm?.isEnabled),
          containerId: payload.gtm?.containerId || "",
        },
        ga4: {
          isEnabled: Boolean(payload.ga4?.isEnabled),
          measurementId: payload.ga4?.measurementId || "",
          apiSecret: payload.ga4?.apiSecret || "",
        },
        tiktok: {
          isEnabled: Boolean(payload.tiktok?.isEnabled),
          pixelCode: payload.tiktok?.pixelCode || "",
          accessToken: payload.tiktok?.accessToken || "",
        },
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
    }
  );

  // Invalidate in-memory cache so subsequent tracking calls use the new values immediately
  invalidateTrackingConfigCache();

  return result;
};

const getPublicMarketingSettingsFromDB = async () => {
  const doc = await MarketingSetting.findOne().lean();
  return {
    meta: {
      isEnabled: Boolean(doc?.meta?.isEnabled),
      pixelId: doc?.meta?.pixelId || "",
    },
    gtm: {
      isEnabled: Boolean(doc?.gtm?.isEnabled),
      containerId: doc?.gtm?.containerId || "",
    },
    ga4: {
      isEnabled: Boolean(doc?.ga4?.isEnabled),
      measurementId: doc?.ga4?.measurementId || "",
    },
    tiktok: {
      isEnabled: Boolean(doc?.tiktok?.isEnabled),
      pixelCode: doc?.tiktok?.pixelCode || "",
    },
  };
};

export const SettingServices = {
  updateSettingsIntoDB,
  getMarketingSettingsFromDB,
  updateMarketingSettingsIntoDB,
  getPublicMarketingSettingsFromDB,
};