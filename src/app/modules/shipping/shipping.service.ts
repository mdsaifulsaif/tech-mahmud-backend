// shipping.service.ts
import { ShippingConfig, DeliverySettings } from "./shipping.model";
import { IDeliverySettings } from "./shipping.interface";

// Default settings if not yet saved in DB
export const DEFAULT_DELIVERY_SETTINGS: IDeliverySettings = {
  baseLocation: "Barisal",
  insideCharge: 60,
  outsideCharge: 150,
  insideEstimatedDays: "24 - 48 Hours",
  outsideEstimatedDays: "2 - 4 Days",
  isFreeShippingActive: false,
  freeShippingMinAmount: 2000,
  isStorePickupActive: true,
  storePickupAddress: "Tech Mahmud Main Store, Sadar Road, Barisal",
  storePickupCharge: 0,
};

// ===== Delivery Settings: Get =====
export const getDeliverySettingsService = async (): Promise<IDeliverySettings> => {
  const settings = await DeliverySettings.findOne();
  if (!settings) {
    return DEFAULT_DELIVERY_SETTINGS;
  }
  return settings.toObject();
};

// ===== Delivery Settings: Update =====
export const updateDeliverySettingsService = async (
  payload: Partial<IDeliverySettings>
): Promise<IDeliverySettings> => {
  const updated = await DeliverySettings.findOneAndUpdate(
    {},
    {
      $set: {
        baseLocation: payload.baseLocation?.trim() || "Barisal",
        insideCharge: Number(payload.insideCharge !== undefined ? payload.insideCharge : 60),
        outsideCharge: Number(payload.outsideCharge !== undefined ? payload.outsideCharge : 150),
        insideEstimatedDays: payload.insideEstimatedDays?.trim() || "24 - 48 Hours",
        outsideEstimatedDays: payload.outsideEstimatedDays?.trim() || "2 - 4 Days",
        isFreeShippingActive: Boolean(payload.isFreeShippingActive),
        freeShippingMinAmount: Number(payload.freeShippingMinAmount || 0),
        isStorePickupActive: Boolean(payload.isStorePickupActive !== undefined ? payload.isStorePickupActive : true),
        storePickupAddress: payload.storePickupAddress?.trim() || "Tech Mahmud Main Store, Sadar Road, Barisal",
        storePickupCharge: Number(payload.storePickupCharge || 0),
      },
    },
    { new: true, upsert: true }
  );

  return updated.toObject();
};

// ===== Shipping charge calculate =====
export const calculateOrderShipping = async (
  deliveryType: "local" | "nationwide" | "pickup" | string,
  subtotal: number,
  isFirstOrder: boolean,
  hasFreeShippingItem: boolean,
  session?: any
): Promise<number> => {
  if (deliveryType === "pickup") return 0;
  if (isFirstOrder || hasFreeShippingItem) return 0;

  const settings = await getDeliverySettingsService();

  // Free shipping check
  if (
    settings.isFreeShippingActive &&
    settings.freeShippingMinAmount > 0 &&
    subtotal >= settings.freeShippingMinAmount
  ) {
    return 0;
  }

  if (deliveryType === "local") {
    return Number(settings.insideCharge ?? 60);
  } else {
    return Number(settings.outsideCharge ?? 150);
  }
};

// Order service compatibility function
export const getShippingAndCommission = async (
  deliveryType: "local" | "nationwide" | "pickup" | string,
  subtotal: number,
  isFirstOrder: boolean,
  hasFreeShippingItem: boolean,
  session?: any
): Promise<{ shippingCharge: number; riderCommission: number; commissionPercentage: number }> => {
  const shippingCharge = await calculateOrderShipping(
    deliveryType,
    subtotal,
    isFirstOrder,
    hasFreeShippingItem,
    session
  );

  return {
    shippingCharge,
    riderCommission: 0,
    commissionPercentage: 0,
  };
};

// ===== Admin: Create/Update config =====
export const updateShippingConfigService = async (
  type: string,
  tiers: any[]
) => {
  if (!type || !["local", "nationwide"].includes(type)) {
    throw new Error("type must be 'local' or 'nationwide'.");
  }
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
    throw new Error("tiers array is required and must not be empty.");
  }

  for (const tier of tiers) {
    if (tier.min === undefined || tier.max === undefined || tier.charge === undefined) {
      throw new Error("Each tier must have min, max, and charge.");
    }
    if (tier.min > tier.max) {
      throw new Error(`Invalid tier range: min (${tier.min}) cannot be greater than max (${tier.max}).`);
    }
  }

  const updateData: any = {
    type,
    tiers,
    isActive: true,
  };

  return await ShippingConfig.findOneAndUpdate(
    { type },
    updateData,
    { new: true, upsert: true }
  );
};

// ===== সব config পাওয়া =====
export const getAllShippingConfigsService = async () => {
  return await ShippingConfig.find().sort({ type: 1 });
};

// ===== Type দিয়ে একটা config পাওয়া =====
export const getShippingConfigByTypeService = async (type: string) => {
  const config = await ShippingConfig.findOne({ type, isActive: true });
  if (!config) throw new Error(`No active shipping configuration found for type: ${type}`);
  return config;
};

// ===== Config disable করা =====
export const deleteShippingConfigService = async (type: string) => {
  const config = await ShippingConfig.findOneAndUpdate(
    { type },
    { isActive: false },
    { new: true }
  );
  if (!config) throw new Error(`No shipping configuration found for type: ${type}`);
  return config;
};
