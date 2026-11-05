import { Request, Response } from 'express';
import { siteSettingServices } from './siteSetting.service';


 const getSettings = async (req: Request, res: Response) => {
  try {
    const data = await siteSettingServices.getStoreSettings();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch settings" });
  }
};

 const updateSettings = async (req: Request, res: Response) => {
  try {
    const data = await siteSettingServices.updateStoreSettings(req.body);
    res.status(200).json({ success: true, data, message: "Settings updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update settings" });
  }
};

export const siteSettingsControllers = {
    getSettings,
    updateSettings
}