import { Router } from "express";
import { ChatControllers } from "./chat.controller";
import { isAuthenticated, isAdmin, optionalAuth } from "../../middlewares/auth.middleware";

const router = Router();

// Public customer routes (with optional auth to link userID if logged in)
router.post("/send", optionalAuth, ChatControllers.userSendMessage);
router.post("/sync-user", optionalAuth, ChatControllers.syncUserInfo);
router.get("/messages/:sessionId", ChatControllers.getMessagesBySessionId);

// Admin routes
router.get("/admin/conversations", isAuthenticated, isAdmin, ChatControllers.adminGetAllConversations);
router.get("/admin/conversations/:id", isAuthenticated, isAdmin, ChatControllers.adminGetConversationDetails);
router.post("/admin/reply", isAuthenticated, isAdmin, ChatControllers.adminReply);

export const ChatRoutes = router;
