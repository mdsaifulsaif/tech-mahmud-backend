import { Request, Response } from "express";
import {
  updateShippingConfigService,
  getAllShippingConfigsService,
  getShippingConfigByTypeService,
  deleteShippingConfigService,
  getShippingAndCommission,
  getDeliverySettingsService,
  updateDeliverySettingsService,
} from "./shipping.service";
import { Order } from "../order/order.model";

// ===== Delivery Settings: Public Get =====
export const getDeliverySettings = async (req: Request, res: Response) => {
  try {
    const settings = await getDeliverySettingsService();
    return res.status(200).json({
      success: true,
      message: "Delivery settings retrieved successfully",
      data: settings,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve delivery settings",
    });
  }
};

// ===== Delivery Settings: Admin Update =====
export const updateDeliverySettings = async (req: Request, res: Response) => {
  try {
    const updated = await updateDeliverySettingsService(req.body);
    return res.status(200).json({
      success: true,
      message: "Delivery settings updated successfully",
      data: updated,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update delivery settings",
    });
  }
};

export const previewShippingCharge = async (req: Request, res: Response) => {
  try {
    const { deliveryType, subtotal } = req.query;
    const userID = (req.user as any)?.id || (req.user as any)?._id;

    if (!deliveryType || subtotal === undefined) {
      return res.status(400).json({
        success: false,
        message: "deliveryType and subtotal are required",
      });
    }

    const parsedSubtotal = Number(subtotal);
    if (isNaN(parsedSubtotal) || parsedSubtotal < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid subtotal",
      });
    }

    let isFirstOrder = false;
    if (userID) {
      const orderCount = await Order.countDocuments({ userID });
      isFirstOrder = orderCount === 0;
    }

    const { shippingCharge } = await getShippingAndCommission(
      deliveryType as string,
      parsedSubtotal,
      isFirstOrder,
      false
    );

    const settings = await getDeliverySettingsService();

    return res.status(200).json({
      success: true,
      data: {
        shippingCharge,
        isFirstOrder,
        baseLocation: settings.baseLocation,
        insideCharge: settings.insideCharge,
        outsideCharge: settings.outsideCharge,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to calculate shipping",
    });
  }
};

export const updateShippingConfig = async (req: Request, res: Response) => {
  try {
    const { type, tiers } = req.body;

    const config = await updateShippingConfigService(type, tiers);

    res.status(200).json({
      success: true,
      message: "Shipping configuration updated successfully",
      data: config,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update shipping configuration",
    });
  }
};

export const getAllShippingConfigs = async (req: Request, res: Response) => {
  try {
    const result = await getAllShippingConfigsService();
    res.status(200).json({
      success: true,
      message: "Shipping configurations retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Something went wrong" });
  }
};

export const getShippingConfigByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const result = await getShippingConfigByTypeService(type as any);
    res.status(200).json({
      success: true,
      message: "Shipping configuration retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message || "Configuration not found" });
  }
};

export const deleteShippingConfig = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const result = await deleteShippingConfigService(type as any);
    res.status(200).json({
      success: true,
      message: "Shipping configuration deleted successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Something went wrong" });
  }
};
