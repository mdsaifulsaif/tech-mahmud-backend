import { Request, Response } from "express";
import { AreaServices } from "./area.service";

const createArea = async (req: Request, res: Response) => {
  try {
    const result = await AreaServices.createArea(req.body);
    res.status(201).json({ success: true, message: "Area created successfully", data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Something went wrong" });
  }
};

const getAllAreas = async (req: Request, res: Response) => {
  try {
    const result = await AreaServices.getAllAreas(req.query);
    res.status(200).json({ 
      success: true, 
      message: "Areas retrieved successfully", 
      meta: result.meta,
      data: result.data 
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateArea = async (req: Request, res: Response) => {
  try {
    const result = await AreaServices.updateArea(req.params.id as string, req.body);
    res.status(200).json({ success: true, message: "Area updated successfully", data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Something went wrong" });
  }
};

const deleteArea = async (req: Request, res: Response) => {
  try {
    const result = await AreaServices.deleteArea(req.params.id as string);
    res.status(200).json({ success: true, message: "Area deleted successfully", data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Something went wrong" });
  }
};

const getSingleArea = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AreaServices.getSingleArea(id as string);
    res.status(200).json({ 
        success: true, 
        message: "Area retrieved successfully", 
        data: result 
    });
  } catch (error: any) {
    res.status(404).json({ 
        success: false, 
        message: error.message || "Area not found" 
    });
  }
};

export const AreaControllers = {
  createArea,
  getAllAreas,
  updateArea,
  deleteArea,
  getSingleArea
};