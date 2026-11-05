import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { Setting } from "./setting.model";
import { SettingServices } from "./setting.service";

// Get General Settings
const getSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await Setting.findOne();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Settings retrieved successfully!",
    data: result || {},
  });
});

// Update/Create General Settings
const updateSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingServices.updateSettingsIntoDB(
    req.body,
    req.files,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Settings updated successfully!",
    data: result,
  });
});

// Get Marketing & Pixels Settings (Admin only)
const getMarketingSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingServices.getMarketingSettingsFromDB();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Marketing settings retrieved successfully!",
    data: result,
  });
});

// Update Marketing & Pixels Settings (Admin only)
const updateMarketingSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingServices.updateMarketingSettingsIntoDB(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Marketing settings updated successfully!",
    data: result,
  });
});

// Get Public Marketing Settings (For Frontend script injection - NO secrets)
const getPublicMarketingSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingServices.getPublicMarketingSettingsFromDB();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Public marketing settings retrieved successfully!",
    data: result,
  });
});

export const SettingControllers = {
  getSettings,
  updateSettings,
  getMarketingSettings,
  updateMarketingSettings,
  getPublicMarketingSettings,
};
