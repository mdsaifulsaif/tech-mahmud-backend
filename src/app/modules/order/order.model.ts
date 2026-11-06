import mongoose, { Schema, Types, model } from "mongoose";
import { IOrder, IOrderItem } from "./order.interface";

const orderItemSchema = new Schema<IOrderItem>(
  {
    productID: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantID: { type: Schema.Types.ObjectId, default: null },
    productType: { type: String, default: "single" },
    productName: { type: String, required: true },
    thumbnail: { type: String, required: true },
    sku: { type: String },
    selectedAttributes: {
      color: { type: String },
      size: { type: String },
      storage: { type: String },
    },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "pcs" },
    weightOrVolume: { type: Number },
    unitPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const deliveryAddressSchema = new Schema(
  {
    name: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    city: { type: String },
    area: {
      type: Schema.Types.Mixed,
      ref: "Area",
    },
    district: { type: String },
    upazila: { type: String },
    houseNo: { type: String },
    road: { type: String },
    block: { type: String },
    floor: { type: String },
    flatNo: { type: String },
    postalCode: { type: String },
    deliveryNotes: { type: String },
    label: {
      type: String,
      enum: ["home", "work", "partner", "other"],
      default: "home",
    },
  },
  { _id: false }
);

const statusTimelineSchema = new Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: function (this: IOrder) {
        return !this.isGuestOrder;
      },
    },
    isGuestOrder: { type: Boolean, default: false },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, uppercase: true },
    couponDiscount: { type: Number, default: 0, min: 0 },
    shippingCharge: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    deliveryType: {
      type: String,
      enum: ["local", "nationwide"],
      default: "local",
    },
    deliveryAddress: { type: deliveryAddressSchema, required: true },
    preferredDeliveryTime: { type: String },
    estimatedDelivery: { type: Date },

    paymentMethod: {
      type: String,
      enum: ["cod", "bkash", "nagad", "card", "bank"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "partially_paid"],
      default: "unpaid",
    },
    transactionID: { type: String, trim: true },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "pending",
    },
    statusTimeline: { type: [statusTimelineSchema], default: [] },

    // Courier Tracking
    courierName: { type: String, trim: true },
    trackingCode: { type: String, trim: true },
    consignmentId: { type: String, trim: true },

    specialInstructions: { type: String },
    isGift: { type: Boolean, default: false },
    giftNote: { type: String },

    deliveryDate: { type: Date, default: null },
    deliveryTime: { type: String, default: null },

    cancelReason: { type: String },
    cancelledBy: { type: String, enum: ["user", "admin"] },
    pendingExpiresAt: { type: Date },
    deliveredAt: { type: Date },

    isOutsideLocation: { type: Boolean, default: false },
    orderPlacedCoords: {
      lat: { type: Number },
      lng: { type: Number },
    },

    returnReason: { type: String },
    returnCondition: {
      type: String,
      enum: ["damaged", "good", "wrong_item", "other"],
      default: "good",
    },
    returnNote: { type: String },
    returnedBy: { type: String, enum: ["user", "admin"] },
    returnedAt: { type: Date },
    refundAmount: { type: Number, default: 0 },
    returnItems: [
      {
        productID: { type: Schema.Types.ObjectId, ref: "Product" },
        productName: { type: String },
        quantity: { type: Number, default: 1 },
        unit: { type: String },
        totalPrice: { type: Number, default: 0 },
        reason: { type: String },
        condition: {
          type: String,
          enum: ["damaged", "good", "wrong_item"],
          default: "good",
        },
        refundAmount: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

// Indexes
orderSchema.index({ userID: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = model<IOrder>("Order", orderSchema);
