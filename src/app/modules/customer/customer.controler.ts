import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserServices } from "./csutomer.service";

/**
 * Get all customers with search, filter, and pagination
 */
const getAllCustomers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getAllCustomersFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Customers retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Get customer statistics for overview cards
 */
const getCustomerStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await UserServices.getCustomerStatsFromDB();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Customer statistics retrieved successfully",
    data: stats,
  });
});

/**
 * Get single customer details with order history
 */
const getSingleCustomer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserServices.getSingleCustomerFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Customer details retrieved successfully",
    data: result,
  });
});

/**
 * Toggle customer active/blocked status
 */
const toggleCustomerStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const result = await UserServices.updateCustomerStatusInDB(
    id as string,
    status
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Customer status changed to ${status}`,
    data: result,
  });
});

/**
 * Update customer details
 */
const updateCustomer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserServices.updateCustomerInDB(id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Customer updated successfully",
    data: result,
  });
});

/**
 * Delete customer
 */
const deleteCustomer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserServices.deleteCustomerFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

export const UserControllers = {
  getAllCustomers,
  getCustomerStats,
  getSingleCustomer,
  toggleCustomerStatus,
  updateCustomer,
  deleteCustomer,
};
