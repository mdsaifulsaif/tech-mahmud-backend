import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AreaRequestServices } from "./areaRequest.service";

/**
 * Public endpoint to submit a delivery area request
 */
const createAreaRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await AreaRequestServices.createAreaRequestToDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Area request submitted successfully! We will notify you when service begins.",
    data: result,
  });
});

/**
 * Admin endpoint: get all area requests
 */
const getAllAreaRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await AreaRequestServices.getAllAreaRequestsFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Area requests retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Admin endpoint: get area request statistics
 */
const getAreaRequestStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await AreaRequestServices.getAreaRequestStatsFromDB();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Area request stats retrieved successfully",
    data: stats,
  });
});

/**
 * Admin endpoint: update status & admin notes
 */
const updateAreaRequestStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AreaRequestServices.updateAreaRequestStatusInDB(
    id as string,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Area request updated successfully",
    data: result,
  });
});

/**
 * Admin endpoint: delete area request
 */
const deleteAreaRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AreaRequestServices.deleteAreaRequestFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Area request deleted successfully",
    data: result,
  });
});

export const AreaRequestControllers = {
  createAreaRequest,
  getAllAreaRequests,
  getAreaRequestStats,
  updateAreaRequestStatus,
  deleteAreaRequest,
};
