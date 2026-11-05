import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { SubscriberServices } from "./subscriber.service";

const subscribeEmail = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriberServices.addSubscriberToDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Subscribed successfully!",
    data: result,
  });
});

const getSubscribers = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriberServices.getAllSubscribersFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscribers list retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSubscriberStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await SubscriberServices.getSubscriberStatsFromDB();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscriber statistics retrieved successfully",
    data: stats,
  });
});

const toggleSubscriberStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await SubscriberServices.toggleSubscriberStatusInDB(id as string, status);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscriber status updated successfully",
    data: result,
  });
});

const deleteSubscriber = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SubscriberServices.deleteSubscriberFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscriber removed successfully",
    data: result,
  });
});

export const SubscriberControllers = {
  subscribeEmail,
  getSubscribers,
  getSubscriberStats,
  toggleSubscriberStatus,
  deleteSubscriber,
};