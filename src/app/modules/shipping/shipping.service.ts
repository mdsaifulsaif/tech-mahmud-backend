// shipping.service.ts
import { ShippingConfig } from "./shipping.model";

// ===== Shipping charge calculate =====
export const calculateOrderShipping = async (
  deliveryType: "local" | "nationwide",
  subtotal: number,
  isFirstOrder: boolean,
  hasFreeShippingItem: boolean,
  session?: any
): Promise<number> => {
  if (isFirstOrder || hasFreeShippingItem) return 0;

  const config = session
    ? await ShippingConfig.findOne({ type: deliveryType, isActive: true }).session(session)
    : await ShippingConfig.findOne({ type: deliveryType, isActive: true });

  if (!config || !config.tiers || config.tiers.length === 0) {
    return deliveryType === "local" ? 70 : 130; // fallback standard charges
  }

  const tier = config.tiers.find((t) => subtotal >= t.min && subtotal <= t.max);
  return tier ? tier.charge : (deliveryType === "local" ? 70 : 130);
};

// Order service compatibility function
export const getShippingAndCommission = async (
  deliveryType: "local" | "nationwide",
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
