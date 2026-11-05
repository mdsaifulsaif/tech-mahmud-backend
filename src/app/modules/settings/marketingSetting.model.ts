import { Schema, model, Document } from "mongoose";

export interface IMarketingSetting extends Document {
  meta: {
    isEnabled: boolean;
    pixelId: string;
    accessToken: string;
    testEventCode?: string;
  };
  gtm: {
    isEnabled: boolean;
    containerId: string;
  };
  ga4: {
    isEnabled: boolean;
    measurementId: string;
    apiSecret: string;
  };
  tiktok: {
    isEnabled: boolean;
    pixelCode: string;
    accessToken: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const marketingSettingSchema = new Schema<IMarketingSetting>(
  {
    meta: {
      isEnabled: { type: Boolean, default: false },
      pixelId: { type: String, default: "" },
      accessToken: { type: String, default: "" },
      testEventCode: { type: String, default: "" },
    },
    gtm: {
      isEnabled: { type: Boolean, default: false },
      containerId: { type: String, default: "" },
    },
    ga4: {
      isEnabled: { type: Boolean, default: false },
      measurementId: { type: String, default: "" },
      apiSecret: { type: String, default: "" },
    },
    tiktok: {
      isEnabled: { type: Boolean, default: false },
      pixelCode: { type: String, default: "" },
      accessToken: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export const MarketingSetting = model<IMarketingSetting>(
  "MarketingSetting",
  marketingSettingSchema
);
