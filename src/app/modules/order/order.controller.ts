// order.controller.ts
import { Request, Response } from "express";
import { OrderServices } from "./order.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const userID = req.user._id as string;
  const result = await OrderServices.createOrderIntoDB(userID, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Order placed successfully!",
    data: result,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const userID = req.user._id as string;
  const result = await OrderServices.getMyOrdersFromDB(userID, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders retrieved successfully!",
    data: result,
  });
});

const getSingleOrder = catchAsync(async (req: Request, res: Response) => {
  const userID = req.user._id as string;
  const { id } = req.params as { id: string };

  const result = await OrderServices.getSingleOrderFromDB(id, userID);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order retrieved successfully!",
    data: result,
  });
});

export const getOrderDetails = async (req: Request, res: Response) => {
  try {
    const { orderID } = req.params;
    const userID = (req.user as any)?.id || (req.user as any)?._id;
    const role = (req.user as any)?.role;

    if (!orderID) {
      return res.status(400).json({
        success: false,
        message: "Order ID or Order Number is required",
      });
    }

    const order = await OrderServices.getOrderDetailsFromDB(orderID as string, userID, role);

    return res.status(200).json({
      success: true,
      message: "Order details retrieved successfully",
      data: order,
    });
  } catch (error: any) {
    const status = error.message?.includes("not authorized")
      ? 403
      : error.message?.includes("not found")
      ? 404
      : 500;

    return res.status(status).json({
      success: false,
      message: error.message || "Failed to retrieve order details",
    });
  }
};

export const editOrder = async (req: Request, res: Response) => {
  try {
    const { orderID } = req.params;
    const userID = (req.user as any)?.id || (req.user as any)?._id;
    const isAdmin = (req.user as any)?.role === "admin";

    if (!orderID) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const updatedOrder = await OrderServices.updateOrderIntoDB(
      orderID as string,
      userID,
      req.body,
      isAdmin,
    );

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error: any) {
    const status = error.message?.includes("not authorized")
      ? 403
      : error.message?.includes("not found")
      ? 404
      : 400;

    return res.status(status).json({
      success: false,
      message: error.message || "Failed to update order",
    });
  }
};

const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const userID = ((req.user as any)?._id || (req.user as any)?.id) as string;
  const { id } = req.params as { id: string };

  const result = await OrderServices.cancelOrderByUser(
    id,
    userID,
    req.body.cancelReason,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order cancelled successfully!",
    data: result,
  });
});

const trackOrderPublic = catchAsync(async (req: Request, res: Response) => {
  const { orderNumber } = req.params as { orderNumber: string };
  const phone = req.query.phone as string | undefined;

  const result = await OrderServices.trackOrderPublic(orderNumber, phone);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order tracking details fetched successfully!",
    data: result,
  });
});

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderServices.getAllOrdersFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All orders fetched successfully!",
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const adminID = req.user._id as string;
  const { id } = req.params as { id: string };

  const result = await OrderServices.updateOrderStatusByAdmin(
    id,
    req.body.status,
    adminID,
    req.body.note,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order status updated!",
    data: result,
  });
});

const updateCourierInfo = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await OrderServices.updateCourierInfo(id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Courier information updated successfully",
    data: result,
  });
});

const adminCreateOrder = async (req: Request, res: Response) => {
  try {
    const order = await OrderServices.adminCreateOrderIntoDB(req.body);

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
};

const getOrderStats = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderServices.getOrderStatsForAdmin();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order stats fetched successfully!",
    data: result,
  });
});

const updatePaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const adminID = ((req.user as any)?._id || (req.user as any)?.id) as string;
  const { id } = req.params as { id: string };

  const result = await OrderServices.updatePaymentStatusByAdmin(
    id,
    req.body.paymentStatus,
    adminID,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment status updated successfully!",
    data: result,
  });
});

const addAdminNote = catchAsync(async (req: Request, res: Response) => {
  const adminID = ((req.user as any)?._id || (req.user as any)?.id) as string;
  const { id } = req.params as { id: string };

  const result = await OrderServices.addAdminNoteToOrder(
    id,
    req.body.note,
    adminID,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin note added successfully!",
    data: result,
  });
});

const processReturn = catchAsync(async (req: Request, res: Response) => {
  const adminID = ((req.user as any)?._id || (req.user as any)?.id) as string;
  const { id } = req.params as { id: string };

  const result = await OrderServices.processReturnByAdmin(
    id,
    adminID,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order return processed successfully!",
    data: result,
  });
});

export const OrderControllers = {
  createOrder,
  adminCreateOrder,
  getMyOrders,
  getSingleOrder,
  cancelOrder,
  trackOrderPublic,
  getAllOrders,
  updateOrderStatus,
  updateCourierInfo,
  getOrderStats,
  updatePaymentStatus,
  addAdminNote,
  processReturn,
};
