export interface IShippingTier {
  min: number;
  max: number;
  charge: number;
}

export type ShippingType = "local" | "nationwide" | "pickup";

export interface IShippingConfig {
  type: ShippingType;
  tiers: IShippingTier[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDeliverySettings {
  baseLocation: string; // e.g. "Barisal" or "Dhaka"
  insideCharge: number; // e.g. 60
  outsideCharge: number; // e.g. 150
  insideEstimatedDays: string; // e.g. "24 - 48 Hours"
  outsideEstimatedDays: string; // e.g. "2 - 4 Days"
  isFreeShippingActive: boolean;
  freeShippingMinAmount: number;
  isStorePickupActive: boolean;
  storePickupAddress: string;
  storePickupCharge: number;
  createdAt?: Date;
  updatedAt?: Date;
}

