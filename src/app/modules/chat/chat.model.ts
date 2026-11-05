import { Schema, model } from "mongoose";
import { IChatMessage, IConversation } from "./chat.interface";

const chatMessageSchema = new Schema<IChatMessage>(
  {
    sender: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    senderName: {
      type: String,
      default: "User",
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const conversationSchema = new Schema<IConversation>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    customerName: {
      type: String,
      default: "Guest Visitor",
      trim: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },
    customerEmail: {
      type: String,
      default: "",
      trim: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadByAdmin: {
      type: Number,
      default: 0,
      min: 0,
    },
    unreadByUser: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const Conversation = model<IConversation>("Conversation", conversationSchema);
