import { Types } from "mongoose";

export interface IChatMessage {
  _id?: Types.ObjectId | string;
  sender: "user" | "admin";
  senderName: string;
  text: string;
  seen: boolean;
  createdAt?: Date;
}

export interface IConversation {
  sessionId: string;
  userID?: Types.ObjectId | string | null;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;

  messages: IChatMessage[];
  lastMessage: string;
  lastMessageAt: Date;
  unreadByAdmin: number;
  unreadByUser: number;
  status: "active" | "closed";
  createdAt?: Date;
  updatedAt?: Date;
}
