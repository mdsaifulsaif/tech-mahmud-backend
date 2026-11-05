import { Conversation } from "./chat.model";

interface UserSendMessagePayload {
  sessionId: string;
  text: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  userID?: string;
}

const isRealCustomerName = (name?: string): boolean => {
  if (!name) return false;
  const lower = name.trim().toLowerCase();
  return (
    lower !== "" &&
    lower !== "customer" &&
    lower !== "guest visitor" &&
    lower !== "guest customer" &&
    lower !== "guest" &&
    lower !== "visitor"
  );
};

const userSendMessageToDB = async (payload: UserSendMessagePayload) => {
  const { sessionId, text, customerName, customerPhone, customerEmail, userID } = payload;

  let conversation = await Conversation.findOne({ sessionId });

  const effectiveName = isRealCustomerName(customerName)
    ? customerName!.trim()
    : conversation?.customerName || customerName || "Customer";

  const newMessage = {
    sender: "user" as const,
    senderName: effectiveName,
    text: text.trim(),
    seen: false,
    createdAt: new Date(),
  };

  if (!conversation) {
    conversation = await Conversation.create({
      sessionId,
      userID: userID || null,
      customerName: isRealCustomerName(customerName) ? customerName!.trim() : "Customer",
      customerPhone: customerPhone || "",
      customerEmail: customerEmail || "",
      messages: [newMessage],
      lastMessage: text.trim(),
      lastMessageAt: new Date(),
      unreadByAdmin: 1,
      unreadByUser: 0,
    });
  } else {
    // Auto-upgrade user identity if logged in or new details provided
    if (isRealCustomerName(customerName)) {
      conversation.customerName = customerName!.trim();
    }
    if (customerPhone && customerPhone.trim() && (!conversation.customerPhone || conversation.customerPhone !== customerPhone.trim())) {
      conversation.customerPhone = customerPhone.trim();
    }
    if (customerEmail && customerEmail.trim() && (!conversation.customerEmail || conversation.customerEmail !== customerEmail.trim())) {
      conversation.customerEmail = customerEmail.trim();
    }
    if (userID && (!conversation.userID || conversation.userID.toString() !== userID.toString())) {
      conversation.userID = userID as any;
    }

    conversation.messages.push(newMessage as any);
    conversation.lastMessage = text.trim();
    conversation.lastMessageAt = new Date();
    conversation.unreadByAdmin += 1;
    conversation.status = "active";
    await conversation.save();
  }

  return conversation;
};

interface SyncUserPayload {
  sessionId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  userID?: string;
}

const syncUserInfoToDB = async (payload: SyncUserPayload) => {
  const { sessionId, customerName, customerPhone, customerEmail, userID } = payload;
  if (!sessionId) return null;

  const conversation = await Conversation.findOne({ sessionId });
  if (!conversation) return null;

  let changed = false;

  if (isRealCustomerName(customerName) && conversation.customerName !== customerName?.trim()) {
    conversation.customerName = customerName!.trim();
    changed = true;
  }

  if (customerPhone && customerPhone.trim() && conversation.customerPhone !== customerPhone.trim()) {
    conversation.customerPhone = customerPhone.trim();
    changed = true;
  }

  if (customerEmail && customerEmail.trim() && conversation.customerEmail !== customerEmail.trim()) {
    conversation.customerEmail = customerEmail.trim();
    changed = true;
  }

  if (userID && (!conversation.userID || conversation.userID.toString() !== userID.toString())) {
    conversation.userID = userID as any;
    changed = true;
  }

  if (changed) {
    await conversation.save();
  }

  return conversation;
};

const getMessagesBySessionIdFromDB = async (sessionId: string) => {
  const conversation = await Conversation.findOne({ sessionId });
  if (!conversation) {
    return {
      conversationId: null,
      messages: [],
      unreadByUser: 0,
    };
  }

  // When customer opens/fetches chat, reset unreadByUser
  if (conversation.unreadByUser > 0) {
    conversation.unreadByUser = 0;
    await conversation.save();
  }

  return {
    conversationId: conversation._id,
    customerName: conversation.customerName,
    messages: conversation.messages,
    unreadByUser: 0,
  };
};

const getAllConversationsForAdmin = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (query.search) {
    const searchRegex = new RegExp(String(query.search).trim(), "i");
    filter.$or = [
      { customerName: searchRegex },
      { customerPhone: searchRegex },
      { customerEmail: searchRegex },
      { lastMessage: searchRegex },
    ];
  }

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  const conversations = await Conversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("-messages");

  const total = await Conversation.countDocuments(filter);
  const totalUnread = await Conversation.countDocuments({ unreadByAdmin: { $gt: 0 } });

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit) || 1,
      totalUnread,
    },
    data: conversations,
  };
};

const getConversationDetailsForAdmin = async (conversationId: string) => {
  const conversation = await Conversation.findById(conversationId).populate("userID", "firstName lastName email phoneNumber");
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Mark all user messages as seen & reset unreadByAdmin
  conversation.unreadByAdmin = 0;
  conversation.messages.forEach((m) => {
    if (m.sender === "user") {
      m.seen = true;
    }
  });
  await conversation.save();

  return conversation;
};

const adminReplyToDB = async (conversationId: string, text: string, adminName?: string) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const replyMessage = {
    sender: "admin" as const,
    senderName: adminName || "ShodaiBari Support",
    text: text.trim(),
    seen: false,
    createdAt: new Date(),
  };

  conversation.messages.push(replyMessage as any);
  conversation.lastMessage = text.trim();
  conversation.lastMessageAt = new Date();
  conversation.unreadByUser += 1;
  await conversation.save();

  return conversation;
};

export const ChatServices = {
  userSendMessageToDB,
  syncUserInfoToDB,
  getMessagesBySessionIdFromDB,
  getAllConversationsForAdmin,
  getConversationDetailsForAdmin,
  adminReplyToDB,
};
