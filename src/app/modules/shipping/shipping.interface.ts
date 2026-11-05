export interface IShippingTier {
  min: number;
  max: number;
  charge: number;
}

export type ShippingType = "local" | "nationwide";

export interface IShippingConfig {
  type: ShippingType;
  tiers: IShippingTier[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
