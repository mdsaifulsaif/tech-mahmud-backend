import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CouponServices } from "./coupon.service";

const createCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponServices.createCouponToDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Coupon created successfully",
    data: result,
  });
});

const getAllCoupons = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponServices.getAllCouponsFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Coupons retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAvailableCoupons = catchAsync(async (req: Request, res: Response) => {
  const currentUserID =
    (req as any).user?._id?.toString() ||
    (req as any).user?.id?.toString() ||
    (req.query.userID as string) ||
    undefined;

  const result = await CouponServices.getActiveCouponsForClient(currentUserID);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Available coupons retrieved successfully",
    data: result,
  });
});

const getSingleCoupon = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CouponServices.getCouponByIdFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Coupon retrieved successfully",
    data: result,
  });
});

const updateCoupon = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CouponServices.updateCouponInDB(id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Coupon updated successfully",
    data: result,
  });
});

const deleteCoupon = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CouponServices.deleteCouponFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Coupon deleted successfully",
    data: result,
  });
});

const applyCoupon = catchAsync(async (req: Request, res: Response) => {
  const { code, couponCode, subtotal, totalAmount, userID, items } = req.body;
  const targetCode = code || couponCode;
  const targetSubtotal = Number(subtotal ?? totalAmount ?? 0);
  const targetUserID =
    userID?.toString() ||
    (req as any).user?._id?.toString() ||
    (req as any).user?.id?.toString() ||
    undefined;

  const result = await CouponServices.validateAndCalculateCoupon(
    targetCode,
    targetSubtotal,
    targetUserID,
    items
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

export const CouponControllers = {
  createCoupon,
  getAllCoupons,
  getAvailableCoupons,
  getSingleCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
};
