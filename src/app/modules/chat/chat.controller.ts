import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ChatServices } from "./chat.service";

const userSendMessage = catchAsync(async (req: Request, res: Response) => {
  const { sessionId, text, customerName, customerPhone, customerEmail, userID } = req.body;

  if (!sessionId || !text?.trim()) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "Session ID and message text are required",
      data: null,
    });
  }

  const result = await ChatServices.userSendMessageToDB({
    sessionId,
    text,
    customerName,
    customerPhone,
    customerEmail,
    userID: userID || (req as any).user?.id || (req as any).user?._id,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Message sent successfully",
    data: result,
  });
});

const getMessagesBySessionId = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "Session ID is required",
      data: null,
    });
  }

  const result = await ChatServices.getMessagesBySessionIdFromDB(sessionId as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Chat messages retrieved successfully",
    data: result,
  });
});

const adminGetAllConversations = catchAsync(async (req: Request, res: Response) => {
  const result = await ChatServices.getAllConversationsForAdmin(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All conversations retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const adminGetConversationDetails = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ChatServices.getConversationDetailsForAdmin(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Conversation details retrieved successfully",
    data: result,
  });
});

const adminReply = catchAsync(async (req: Request, res: Response) => {
  const { conversationId, text, adminName } = req.body;

  if (!conversationId || !text?.trim()) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "Conversation ID and reply text are required",
      data: null,
    });
  }

  const adminUser = (req as any).user;
  const finalAdminName =
    adminName ||
    (adminUser?.firstName ? `${adminUser.firstName} ${adminUser.lastName || ""}`.trim() : "ShodaiBari Support");

  const result = await ChatServices.adminReplyToDB(conversationId, text, finalAdminName);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Reply sent successfully",
    data: result,
  });
});

const syncUserInfo = catchAsync(async (req: Request, res: Response) => {
  const { sessionId, customerName, customerPhone, customerEmail, userID } = req.body;

  if (!sessionId) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "Session ID is required",
      data: null,
    });
  }

  const result = await ChatServices.syncUserInfoToDB({
    sessionId,
    customerName,
    customerPhone,
    customerEmail,
    userID: userID || (req as any).user?.id || (req as any).user?._id,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User info synced successfully",
    data: result,
  });
});

export const ChatControllers = {
  userSendMessage,
  syncUserInfo,
  getMessagesBySessionId,
  adminGetAllConversations,
  adminGetConversationDetails,
  adminReply,
};
