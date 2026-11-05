import { Request, Response } from "express";
import { DashboardServices } from "./dashboard.service";

const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const result = await DashboardServices.getDashboardStatsFromDB(req.query);
    res.status(200).json({
      success: true,
      message: "Dashboard stats retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const DashboardControllers = {
  getDashboardStats,
};