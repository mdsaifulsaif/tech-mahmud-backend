

import { calculateOrderShipping } from "../shipping/shipping.service";



export const calculateShipping = async (
  deliveryType: "local" | "nationwide",
  subtotal: number,
  isFirstOrder: boolean = false,
  hasFreeShippingItem: boolean = false,
  session?: any,
): Promise<number> => {
  return await calculateOrderShipping(
    deliveryType,
    subtotal,
    isFirstOrder,
    hasFreeShippingItem,
    session,
  );
};