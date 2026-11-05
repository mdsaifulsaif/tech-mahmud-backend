import mongoose, { Types } from "mongoose";
import { Order } from "./order.model";
import { Product } from "../product/product.model";
import * as nodeCrypto from "crypto";
import { IOrder, IOrderItem } from "./order.interface";
import { Unit } from "../unit/unit.model";
import { getIO } from "../../config/socket";
import { getShippingAndCommission } from "../shipping/shipping.service";
import { User } from "../auth/user.model";
import { TrackingEventPayload } from "../traking/tracking.interface";
import { dispatchTrackingEvent } from "../traking/services/eventDispatcher.service";
import { CouponServices } from "../coupon/coupon.service";

// ===================== HELPER: Stock Restore =====================

const restoreStockForItems = async (
  items: IOrderItem[],
  prevStatus: string,
  session: mongoose.ClientSession,
) => {
  for (const item of items) {
    const orderItem = item as any;

    if (orderItem.productType === "combo") {
      const comboProduct = await Product.findById(orderItem.productID).session(
        session,
      );
      if (!comboProduct?.comboItems) continue;

      // কম্বো মেইন প্রোডাক্টের ক্ষেত্রে
      if (prevStatus === "pending") {
        await Product.findByIdAndUpdate(
          orderItem.productID,
          { $inc: { reservedStock: -orderItem.quantity } },
          { session },
        );
      } else if (prevStatus === "confirmed") {
        await Product.findByIdAndUpdate(
          orderItem.productID,
          { $inc: { stock: orderItem.quantity } },
          { session },
        );
      }

      // কম্বো ভেতরের আইটেম
      for (const comboItem of comboProduct.comboItems) {
        const reverseQty = (comboItem.quantity || 1) * orderItem.quantity;
        if (comboItem.selectedVariant) {
          await Product.findOneAndUpdate(
            {
              _id: comboItem.productID,
              "variants._id": comboItem.selectedVariant,
            },
            { $inc: { "variants.$.stock": reverseQty, stock: reverseQty } },
            { session },
          );
        } else {
          await Product.findByIdAndUpdate(
            comboItem.productID,
            { $inc: { stock: reverseQty } },
            { session },
          );
        }
      }
    } else if (orderItem.variantID) {
      if (prevStatus === "pending") {
        await Product.findByIdAndUpdate(
          orderItem.productID,
          { $inc: { reservedStock: -orderItem.quantity } },
          { session },
        );
      } else if (prevStatus === "confirmed") {
        await Product.findOneAndUpdate(
          { _id: orderItem.productID, "variants._id": orderItem.variantID },
          {
            $inc: {
              "variants.$.stock": orderItem.quantity,
              stock: orderItem.quantity,
            },
          },
          { session },
        );
      }
    } else {
      // Single Product
      if (prevStatus === "pending") {
        await Product.findByIdAndUpdate(
          orderItem.productID,
          { $inc: { reservedStock: -orderItem.quantity } },
          { session },
        );
      } else if (prevStatus === "confirmed") {
        await Product.findByIdAndUpdate(
          orderItem.productID,
          { $inc: { stock: orderItem.quantity } },
          { session },
        );
      }
    }
  }
};

const deductStockForItems = async (
  items: IOrderItem[],
  session: mongoose.ClientSession,
) => {
  for (const item of items) {
    const orderItem = item as any;

    if (orderItem.productType === "combo") {
      const comboProduct = await Product.findById(orderItem.productID).session(session);
      if (!comboProduct?.comboItems) continue;

      await Product.findByIdAndUpdate(
        orderItem.productID,
        { $inc: { reservedStock: -orderItem.quantity, stock: -orderItem.quantity } },
        { session },
      );

      for (const comboItem of comboProduct.comboItems) {
        const deductQty = (comboItem.quantity || 1) * orderItem.quantity;
        if (comboItem.selectedVariant) {
          await Product.findOneAndUpdate(
            {
              _id: comboItem.productID,
              "variants._id": comboItem.selectedVariant,
            },
            { $inc: { "variants.$.stock": -deductQty, stock: -deductQty } },
            { session },
          );
        } else {
          await Product.findByIdAndUpdate(
            comboItem.productID,
            { $inc: { stock: -deductQty } },
            { session },
          );
        }
      }
    } else if (orderItem.variantID) {
      await Product.findOneAndUpdate(
        { _id: orderItem.productID, "variants._id": orderItem.variantID },
        {
          $inc: {
            reservedStock: -orderItem.quantity,
            "variants.$.stock": -orderItem.quantity,
            stock: -orderItem.quantity,
          },
        },
        { session },
      );
    } else {
      // Single Product
      await Product.findByIdAndUpdate(
        orderItem.productID,
        { $inc: { reservedStock: -orderItem.quantity, stock: -orderItem.quantity } },
        { session },
      );
    }
  }
};

const createOrderIntoDB = async (userID: string, payload: any) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      items,
      deliveryType,
      deliveryAddress,
      paymentMethod,
      deliveryDate, // ✅ নতুন - optional, "2026-07-10"
      deliveryTime, // ✅ নতুন - optional, "15:30"
      couponCode,
      specialInstructions,
      isGift,
      giftNote,
    } = payload;

    if (!items || items.length === 0) {
      throw new Error("Order must have at least one item!");
    }

    const orderItems: IOrderItem[] = [];
    let subtotal = 0;
    let hasFreeShippingItem = false;

    for (const item of items) {
      let product: any = await Product.findById(item.productID).session(session);

      if (!product) throw new Error(`Product not found: ${item.productID}`);
      if (product.status !== "active")
        throw new Error(`Product unavailable: ${product.name}`);

      let unitPrice = product.regularPrice;
      let salePrice: number | undefined = product.salePrice;
      let sku: string | undefined = product.sku;
      let unit = "pcs";
      let weightOrVolume: number | undefined = product.weightOrVolume;
      let variantID: Types.ObjectId | null = null;
      let selectedAttributes: any = item.selectedAttributes || undefined;
      let thumbnail = product.thumbnail;

      if (product.productType === "combo") {
        const available = product.stock - (product.reservedStock || 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for combo: ${product.name}`);
        }
        unitPrice = product.regularPrice;
        salePrice = product.salePrice;
      } else if (item.variantID && product.variants?.length) {
        const vIdx = (product.variants ?? []).findIndex(
          (v: any) => v._id?.toString() === item.variantID?.toString()
        );

        if (vIdx === -1)
          throw new Error(`Variant not found for: ${product.name}`);

        const variant = product.variants[vIdx] as any;
        const available = variant.stock - (product.reservedStock || 0);

        if (available < item.quantity) {
          throw new Error(`Insufficient stock for variant of: ${product.name}`);
        }

        unitPrice = variant.regularPrice;
        salePrice = variant.salePrice;
        sku = variant.sku || product.sku;
        variantID = variant._id as Types.ObjectId;
        if (variant.image) thumbnail = variant.image;
        if (!selectedAttributes && variant.attributes) {
          selectedAttributes = {
            color: variant.attributes.color?.name,
            size: variant.attributes.size,
            storage: variant.attributes.storage,
          };
        }
      } else {
        const available = product.stock - (product.reservedStock || 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for: ${product.name}`);
        }
      }

      if ((product as any).freeShipping === true || (product as any).isFreeShipping === true) {
        hasFreeShippingItem = true;
      }

      const effectivePrice = salePrice && salePrice > 0 ? salePrice : unitPrice;
      const totalPrice = effectivePrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productID: product._id as Types.ObjectId,
        variantID,
        productName: product.name,
        thumbnail,
        sku,
        selectedAttributes,
        quantity: item.quantity,
        unit,
        weightOrVolume,
        unitPrice,
        salePrice,
        totalPrice,
        productType: product.productType || "single",
      } as IOrderItem);
    }

    // ============================================
    // ✅ Delivery Date/Time Validation
    // ============================================
    let finalDeliveryDate: Date | undefined = undefined;
    let finalDeliveryTime: string | undefined = undefined;

    if (deliveryType === "local" && deliveryDate && deliveryTime) {
      const selectedDate = new Date(deliveryDate);
      const now = new Date();

      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      if (selectedDate < todayStart) {
        throw new Error("Delivery date cannot be in the past!");
      }

      const isToday = selectedDate.toDateString() === now.toDateString();
      if (isToday) {
        const [selHour, selMin] = deliveryTime.split(":").map(Number);
        const selectedMinutes = selHour * 60 + selMin;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        if (selectedMinutes <= currentMinutes) {
          throw new Error("Delivery time must be later than the current time!");
        }
      }

      finalDeliveryDate = selectedDate;
      finalDeliveryTime = deliveryTime;
    }

    // ============================================
    // ✅ Check if user is first order
    // ============================================
    const orderCount: number = await Order.countDocuments({ userID }).session(
      session,
    );
    const isFirstOrder: boolean = orderCount === 0;

    // ============================================
    // ✅ Calculate Shipping & Commission together
    // ============================================
    const { shippingCharge, riderCommission, commissionPercentage } =
      await getShippingAndCommission(
        deliveryType,
        subtotal,
        isFirstOrder,
        hasFreeShippingItem,
        session,
      );

    // ============================================
    // ✅ Coupon Discount (if any)
    // ============================================
    let couponDiscount = 0;
    let appliedCouponCode = couponCode || undefined;

    if (couponCode) {
      try {
        const validated = await CouponServices.validateAndCalculateCoupon(
          couponCode,
          subtotal,
          userID,
          orderItems as any
        );
        couponDiscount = validated.discountAmount;
        appliedCouponCode = validated.couponCode;
      } catch (couponErr: any) {
        console.warn("Coupon validation failed:", couponErr?.message);
        // Do not block order, but discount stays 0 if invalid
      }
    }

    // ============================================
    // ✅ Calculate Total Amount
    // ============================================
    const totalAmount = subtotal - couponDiscount + shippingCharge;

    // ============================================
    // ✅ Estimated Delivery
    // ============================================
    const estimatedDelivery = finalDeliveryDate
      ? new Date(finalDeliveryDate)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + (deliveryType === "local" ? 0 : 3));
          return d;
        })();

    // ============================================
    // ✅ Prepare Order Data
    // ============================================
    const orderData: Partial<IOrder> = {
      userID: userID as any,
      items: orderItems,
      subtotal,
      discountAmount: couponDiscount,
      couponCode: appliedCouponCode,
      couponDiscount,
      shippingCharge,

      totalAmount,
      deliveryType,
      deliveryAddress,
      deliveryDate: finalDeliveryDate,
      deliveryTime: finalDeliveryTime,
      estimatedDelivery,
      paymentMethod,
      paymentStatus: "unpaid",
      specialInstructions,
      isGift: isGift || false,
      giftNote: isGift ? giftNote : undefined,
      // ✅ Location verification (Super Admin check flag)
      isOutsideLocation: Boolean(payload.isOutsideLocation),
      orderPlacedCoords: payload.orderPlacedCoords || undefined,
    };

    console.log("📦 Order Data:", {
      shippingCharge,
      isOutsideLocation: payload.isOutsideLocation,
    });

    // ============================================
    // ✅ Create Order
    // ============================================
    const [order] = await Order.create([orderData], { session });

    // ============================================
    // ✅ Update Reserved Stock
    // ============================================
    for (const item of orderItems) {
      if (item.productType !== "package") {
        await Product.findByIdAndUpdate(
          item.productID,
          { $inc: { reservedStock: item.quantity } },
          { session },
        );
      }
    }

    // ============================================
    // ✅ Commit Transaction
    // ============================================
    await session.commitTransaction();

    if (appliedCouponCode && couponDiscount > 0) {
      CouponServices.incrementCouponUsage(appliedCouponCode).catch((err) =>
        console.error("Failed to increment coupon usage:", err)
      );
    }

    // ============================================
    // ✅ Purchase Event Tracking (FB/TikTok/GA4)
    // ============================================
    try {
      const trackingPayload: TrackingEventPayload = {
        eventName: "Purchase",
        eventId: order._id.toString(), // IMPORTANT: frontend-eo checkout-confirm page-e eki id pathiyo (dedup-er jonno)
        actionSource: "website",
        userData: {
          externalId: userID,
          // email/phone thakle ekhane pathabe (user document theke ana lagbe age)
        },
        customData: {
          currency: "BDT",
          value: totalAmount,
          orderId: order._id.toString(),
          numItems: orderItems.length,
          contentType: "product",
          contentIds: orderItems.map((i) => i.productID.toString()),
          contents: orderItems.map((i) => ({
            id: i.productID.toString(),
            quantity: i.quantity,
            price: i.unitPrice,
            itemName: i.productName,
          })),
        },
      };

      // fire-and-forget — tracking fail hole order response block hobe na
      dispatchTrackingEvent(trackingPayload).catch((err) =>
        console.error(
          "[Tracking] Purchase event dispatch failed:",
          err.message,
        ),
      );
    } catch (trackingError) {
      console.error("[Tracking] Payload build failed:", trackingError);
    }

    // src/app/modules/order/order.service.ts
    // createOrderIntoDB ফাংশনের শেষে

    // ============================================
    // ✅ Notify Admins via Socket
    // ============================================
    try {
      const io = getIO();
      if (io) {
        const notificationData = {
          orderID: order._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          amount: order.totalAmount,
          deliveryFee: shippingCharge,
          deliveryCharge: shippingCharge,
          itemCount: orderItems.length,
          items: orderItems.length,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          timestamp: new Date().toISOString(),
          userID: userID,
          customerName: payload.customerName || "Customer",
          customerPhone: payload.customerPhone || "N/A",
        };

        io.to("admins").emit("admin-new-order-notification", notificationData);
        console.log(`✅ Notified admins for order ${order.orderNumber}`);
      }
    } catch (socketError) {
      console.error("❌ Socket notification error:", socketError);
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const updateOrderStatusByAdmin = async (
  orderID: string,
  status: string,
  note: string,
  adminID: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderID);
    const filter: any = isObjectId ? { _id: orderID } : { orderNumber: orderID };

    const order = await Order.findOne(filter).session(session);
    if (!order) throw new Error("Order not found!");

    const prevStatus = order.status;

    order.status = status as any;
    order.statusTimeline.push({
      status: status as any,
      changedAt: new Date(),
      note: note || `Order status updated to ${status} by admin`,
      changedBy: adminID as any,
    });

    // pending → confirmed: actual stock deduct
    if (status === "confirmed" && prevStatus === "pending") {
      await deductStockForItems(
        order.items as unknown as IOrderItem[],
        session,
      );
    }

    // cancelled: stock return, release rider, handle refund if paid
    if (status === "cancelled") {
      order.cancelledBy = "admin";
      order.cancelReason = note || "Cancelled by admin";

      // Tk er hisab: if order was paid, mark as refunded
      if (order.paymentStatus === "paid") {
        order.paymentStatus = "refunded";
        order.refundAmount = order.totalAmount;
        order.statusTimeline.push({
          status: "cancelled",
          changedAt: new Date(),
          note: `Payment of ৳${order.totalAmount} marked for refund to customer.`,
        });
      }

      await restoreStockForItems(
        order.items as unknown as IOrderItem[],
        prevStatus,
        session,
      );
    }

    // returned: stock return (if undamaged), handle refund if paid
    if (status === "returned") {
      order.returnedBy = "admin";
      order.returnedAt = new Date();
      order.returnNote = note || "Marked as returned by admin";
      order.returnReason = note || "Return processed by admin";

      // Tk er hisab:
      if (order.paymentStatus === "paid") {
        order.paymentStatus = "refunded";
        order.refundAmount = order.totalAmount;
        order.statusTimeline.push({
          status: "returned",
          changedAt: new Date(),
          note: `Payment of ৳${order.totalAmount} marked for refund to customer due to return.`,
        });
      } else if (order.paymentMethod === "cod") {
        order.paymentStatus = "unpaid";
      }

      // Stock return for returned order
      if (prevStatus !== "pending") {
        await restoreStockForItems(
          order.items as unknown as IOrderItem[],
          prevStatus,
          session,
        );
      }
    }

    await order.save({ session });
    await session.commitTransaction();

    // Socket notification
    try {
      const io = getIO();
      io?.to(`order-${order._id}`).emit("order-status-update", {
        orderID: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        refundAmount: order.refundAmount,
        message: `Order status updated to ${status}.`,
      });
      io?.to("admins").emit("order-status-changed", {
        orderID: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        refundAmount: order.refundAmount,
      });
    } catch (socketError) {
      console.error("Socket notify error (updateOrderStatusByAdmin):", socketError);
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ===================== USER CANCEL =====================
const cancelOrderByUser = async (
  orderID: string,
  userID: string,
  reason: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderID);
    const filter: any = isObjectId
      ? { _id: orderID, userID }
      : { orderNumber: orderID, userID };

    const order = await Order.findOne(filter).session(session);
    if (!order) throw new Error("Order not found!");

    const cancellableStatuses = ["pending", "confirmed"];
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error(`Cannot cancel order in '${order.status}' status`);
    }

    const prevStatus = order.status;

    order.status = "cancelled";
    order.cancelReason = reason || "Cancelled by customer";
    order.cancelledBy = "user";
    order.statusTimeline.push({
      status: "cancelled",
      changedAt: new Date(),
      note: reason || "Order cancelled by customer",
    });

    // ✅ Tk er hisab: If order was paid, mark as refunded so accounts balance
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";
      order.statusTimeline.push({
        status: "cancelled",
        changedAt: new Date(),
        note: `Payment of ৳${order.totalAmount} marked for refund to customer.`,
      });
    }

    await restoreStockForItems(
      order.items as unknown as IOrderItem[],
      prevStatus,
      session,
    );

    await order.save({ session });
    await session.commitTransaction();

    // ✅ Socket notification
    try {
      const io = getIO();
      io?.to(`order-${order._id}`).emit("order-status-update", {
        orderID: order._id,
        orderNumber: order.orderNumber,
        status: "cancelled",
        paymentStatus: order.paymentStatus,
        cancelReason: order.cancelReason,
        message: "Order has been cancelled by customer.",
      });
      io?.to("admin-room").emit("order-cancelled", {
        orderID: order._id,
        orderNumber: order.orderNumber,
        cancelledBy: "user",
        refundAmount: order.paymentStatus === "refunded" ? order.totalAmount : 0,
      });
    } catch (socketError) {
      console.error("Socket notify error (cancelOrderByUser):", socketError);
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const autoExpireOrders = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();

    console.log(
      `[Expiry Job] Checking for orders expired before: ${now.toISOString()}`,
    );

    const expiredOrders = await Order.find({
      status: "pending",
      pendingExpiresAt: { $lte: now },
    }).session(session);

    if (expiredOrders.length === 0) {
      console.log("[Expiry Job] No expired orders found.");
      await session.commitTransaction();
      return 0;
    }

    console.log(`[Expiry Job] Found ${expiredOrders.length} orders to cancel.`);

    for (const order of expiredOrders) {
      order.status = "cancelled";
      order.cancelReason = "Auto cancelled - payment timeout";
      order.cancelledBy = "admin";

      order.statusTimeline.push({
        status: "cancelled",
        changedAt: new Date(),
        note: "Auto cancelled after 30 minutes",
      });

      await restoreStockForItems(
        order.items as unknown as IOrderItem[],
        "pending",
        session,
      );

      await order.save({ session });
      console.log(
        `[Expiry Job] Order ${order.orderNumber} has been cancelled.`,
      );
    }

    await session.commitTransaction();
    return expiredOrders.length;
  } catch (error) {
    await session.abortTransaction();
    console.error("[Expiry Job] Error occurred:", error);
    throw error;
  } finally {
    session.endSession();
  }
};

const getSingleOrderFromDB = async (orderID: string, userID: string) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(orderID);
  const filter: any = isObjectId
    ? { _id: orderID, userID }
    : { orderNumber: orderID, userID };

  const order = await Order.findOne(filter)
    .populate("items.productID", "name thumbnail slug")
    .populate("deliveryAddress.area", "name");
  if (!order) throw new Error("Order not found!");
  return order;
};

// ===================== QUERIES =====================
const getMyOrdersFromDB = async (userID: string, query: any) => {
  const { page = 1, limit = 10, status } = query;
  const filter: any = { userID, ...(status && { status }) };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("-statusTimeline"),
    Order.countDocuments(filter),
  ]);

  return { orders, total, page: Number(page), limit: Number(limit) };
};

const getAllOrdersFromDB = async (query: any) => {
  const {
    page = 1,
    limit = 20,
    status,
    paymentStatus,
    deliveryType,
    search,
    from,
    to,
  } = query;

  const filter: any = {};
  if (status && status !== "all") filter.status = status;
  if (paymentStatus && paymentStatus !== "all") filter.paymentStatus = paymentStatus;
  if (deliveryType && deliveryType !== "all") filter.deliveryType = deliveryType;

  if (search && String(search).trim()) {
    const s = String(search).trim();
    filter.$or = [
      { orderNumber: { $regex: s, $options: "i" } },
      { "deliveryAddress.phone": { $regex: s, $options: "i" } },
      { "deliveryAddress.name": { $regex: s, $options: "i" } },
    ];
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("userID", "name phone email")
      .populate("deliveryAddress.area", "name"),
    Order.countDocuments(filter),
  ]);

  return { orders, total, page: Number(page), limit: Number(limit) };
};

const getOrderStatsForAdmin = async () => {
  const [
    totalOrders,
    pending,
    confirmed,
    processing,
    shipped,
    out_for_delivery,
    delivered,
    cancelled,
    returned,
    paidOrders,
    unpaidOrders,
    refundedOrders,
    revenueAgg,
    refundAgg,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments({ status: "confirmed" }),
    Order.countDocuments({ status: "processing" }),
    Order.countDocuments({ status: "shipped" }),
    Order.countDocuments({ status: "out_for_delivery" }),
    Order.countDocuments({ status: "delivered" }),
    Order.countDocuments({ status: "cancelled" }),
    Order.countDocuments({ status: "returned" }),
    Order.countDocuments({ paymentStatus: "paid" }),
    Order.countDocuments({ paymentStatus: "unpaid" }),
    Order.countDocuments({ paymentStatus: "refunded" }),
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: "refunded" } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$refundAmount", "$totalAmount"] } } } },
    ]),
  ]);

  return {
    totalOrders,
    statusCounts: {
      all: totalOrders,
      pending,
      confirmed,
      processing,
      shipped,
      out_for_delivery,
      delivered,
      cancelled,
      returned,
    },
    paymentCounts: {
      paid: paidOrders,
      unpaid: unpaidOrders,
      refunded: refundedOrders,
    },
    totalRevenue: revenueAgg[0]?.total || 0,
    totalRefund: refundAgg[0]?.total || 0,
  };
};

const updatePaymentStatusByAdmin = async (
  orderID: string,
  paymentStatus: string,
  adminID: string,
) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(orderID);
  const filter: any = isObjectId ? { _id: orderID } : { orderNumber: orderID };

  const order = await Order.findOne(filter);
  if (!order) throw new Error("Order not found!");

  order.paymentStatus = paymentStatus as any;
  if (paymentStatus === "refunded" && !order.refundAmount) {
    order.refundAmount = order.totalAmount;
  }

  order.statusTimeline.push({
    status: order.status,
    changedAt: new Date(),
    note: `Payment status updated to ${paymentStatus} by admin`,
    changedBy: adminID as any,
  });

  await order.save();

  try {
    const io = getIO();
    io?.to(`order-${order._id}`).emit("order-status-update", {
      orderID: order._id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      refundAmount: order.refundAmount,
    });
  } catch (e) {}

  return order;
};

const addAdminNoteToOrder = async (
  orderID: string,
  note: string,
  adminID: string,
) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(orderID);
  const filter: any = isObjectId ? { _id: orderID } : { orderNumber: orderID };

  const order = await Order.findOne(filter);
  if (!order) throw new Error("Order not found!");

  (order as any).adminNote = note;
  order.statusTimeline.push({
    status: order.status,
    changedAt: new Date(),
    note: `Admin note: ${note}`,
    changedBy: adminID as any,
  });

  await order.save();
  return order;
};

const processReturnByAdmin = async (
  orderID: string,
  adminID: string,
  payload: {
    returnReason: string;
    returnCondition: "damaged" | "good" | "wrong_item" | "other";
    returnNote?: string;
    returnedItems?: Array<{
      productID: string;
      quantity: number;
      condition?: "damaged" | "good" | "wrong_item";
      reason?: string;
    }>;
  },
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderID);
    const filter: any = isObjectId ? { _id: orderID } : { orderNumber: orderID };

    const order = await Order.findOne(filter).session(session);
    if (!order) throw new Error("Order not found!");

    const prevStatus = order.status;
    const hasSpecificItems = Array.isArray(payload.returnedItems) && payload.returnedItems.length > 0;

    if (hasSpecificItems) {
      let partialRefundTotal = 0;
      const returnItemsList: any[] = [];

      for (const retItem of payload.returnedItems!) {
        const matchingOrderItem = order.items.find(
          (item) => item.productID?.toString() === retItem.productID.toString(),
        );

        if (matchingOrderItem) {
          const itemPrice = matchingOrderItem.salePrice ?? matchingOrderItem.unitPrice;
          const returnSubtotal = itemPrice * retItem.quantity;
          partialRefundTotal += returnSubtotal;

          returnItemsList.push({
            productID: matchingOrderItem.productID,
            productName: matchingOrderItem.productName,
            quantity: retItem.quantity,
            unit: matchingOrderItem.unit,
            totalPrice: returnSubtotal,
            reason: retItem.reason || payload.returnReason,
            condition: retItem.condition || payload.returnCondition,
            refundAmount: returnSubtotal,
          });

          if (retItem.condition !== "damaged" && payload.returnCondition !== "damaged") {
            const { Product } = await import("../product/product.model");
            await Product.findByIdAndUpdate(
              matchingOrderItem.productID,
              { $inc: { stock: retItem.quantity } },
              { session },
            );
          }
        }
      }

      order.returnItems = [...(order.returnItems || []), ...returnItemsList];
      order.refundAmount = (order.refundAmount || 0) + partialRefundTotal;

      if (order.paymentStatus === "paid") {
        if (order.refundAmount >= order.totalAmount) {
          order.paymentStatus = "refunded";
          order.status = "returned";
        } else {
          order.paymentStatus = "partially_paid";
        }
      }

      order.statusTimeline.push({
        status: order.status,
        changedAt: new Date(),
        note: `Processed return of ${returnItemsList.length} item(s). Return total: ৳${partialRefundTotal}. Reason: ${payload.returnReason}. Refund total: ৳${order.refundAmount}`,
        changedBy: adminID as any,
      });
    } else {
      order.status = "returned";
      order.returnedBy = "admin";
      order.returnedAt = new Date();
      order.returnReason = payload.returnReason || "Full order returned";
      order.returnCondition = payload.returnCondition || "good";
      order.returnNote = payload.returnNote || "";

      if (order.paymentStatus === "paid") {
        order.paymentStatus = "refunded";
        order.refundAmount = order.totalAmount;
      } else if (order.paymentMethod === "cod") {
        order.paymentStatus = "unpaid";
      }

      order.statusTimeline.push({
        status: "returned",
        changedAt: new Date(),
        note: `Order returned (${payload.returnCondition}). Reason: ${payload.returnReason}. Refund: ৳${order.refundAmount || 0}`,
        changedBy: adminID as any,
      });

      if (payload.returnCondition !== "damaged") {
        await restoreStockForItems(
          order.items as unknown as IOrderItem[],
          prevStatus,
          session,
        );
      }
    }

    await order.save({ session });
    await session.commitTransaction();

    try {
      const io = getIO();
      io?.to(`order-${order._id}`).emit("order-status-update", {
        orderID: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        refundAmount: order.refundAmount,
        message: `Return processed. Status: ${order.status}.`,
      });
      io?.to("admins").emit("order-returned", {
        orderID: order._id,
        orderNumber: order.orderNumber,
        refundAmount: order.refundAmount,
        paymentStatus: order.paymentStatus,
        returnReason: payload.returnReason,
      });
    } catch (e) {}

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getOrderDetailsFromDB = async (
  orderID: string,
  userID: string,
  role?: string,
) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(orderID);
  const filter: any = isObjectId ? { _id: orderID } : { orderNumber: orderID };

  const order = await Order.findOne(filter)
    .populate("items.productID", "name thumbnail")
    .populate("deliveryAddress.area", "name");

  if (!order) {
    throw new Error("Order not found!");
  }

  // 1. Admin can view all orders
  if (role === "admin") {
    return order;
  }

  // 2. Customer who placed the order can view it
  if (order.userID && order.userID.toString() === userID.toString()) {
    return order;
  }

  throw new Error("You are not authorized to view this order!");
};

// ===================== PUBLIC / REALTIME ORDER TRACKING =====================
const trackOrderPublic = async (orderIdentifier: string, phone?: string) => {
  if (!orderIdentifier) {
    throw new Error("Order number or Order ID is required");
  }

  const cleanIdentifier = orderIdentifier.trim();
  const isObjectId = mongoose.Types.ObjectId.isValid(cleanIdentifier);
  const filter: any = isObjectId
    ? { $or: [{ _id: cleanIdentifier }, { orderNumber: cleanIdentifier }] }
    : { orderNumber: { $regex: new RegExp(`^${cleanIdentifier}$`, "i") } };

  if (phone && phone.trim()) {
    filter["deliveryAddress.phone"] = { $regex: phone.trim() };
  }

  const order = await Order.findOne(filter)
    .populate("items.productID", "name thumbnail slug")
    .populate("deliveryAddress.area", "name");

  if (!order) {
    throw new Error("No order found with the provided details.");
  }

  return order;
};


const updateOrderIntoDB = async (
  orderID: string,
  userID: string,
  payload: any,
  isAdmin: boolean = false,
) => {
  const order = await Order.findById(orderID);

  if (!order) {
    throw new Error("Order not found!");
  }

  if (!isAdmin && order.userID.toString() !== userID.toString()) {
    throw new Error("You are not authorized to edit this order!");
  }

  const nonEditableStatuses = ["confirmed", "shipped", "delivered", "cancelled"];
  if (!isAdmin && nonEditableStatuses.includes(order.status as string)) {
    throw new Error(
      `Order cannot be edited once it is "${order.status}". Please contact support.`,
    );
  }
  if (!isAdmin && order.paymentStatus === "paid") {
    throw new Error("Paid orders cannot be edited. Please contact support.");
  }

  const editableFields: Record<string, any> = {};

  if (payload.deliveryAddress) {
    // ✅ ফিক্স — Mongoose subdocument কে plain object এ কনভার্ট করে merge
    const currentAddress = (order.deliveryAddress as any)?.toObject
      ? (order.deliveryAddress as any).toObject()
      : order.deliveryAddress;

    editableFields.deliveryAddress = {
      ...currentAddress,
      ...payload.deliveryAddress,
    };
  }

  if (payload.deliveryDate !== undefined) {
    editableFields.deliveryDate = payload.deliveryDate
      ? new Date(payload.deliveryDate)
      : undefined;
  }

  if (payload.deliveryTime !== undefined) {
    editableFields.deliveryTime = payload.deliveryTime || undefined;
  }

  if (payload.specialInstructions !== undefined) {
    editableFields.specialInstructions = payload.specialInstructions;
  }

  if (payload.paymentMethod !== undefined) {
    editableFields.paymentMethod = payload.paymentMethod;
  }

  if (isAdmin) {
    if (payload.status !== undefined) editableFields.status = payload.status;
    if (payload.paymentStatus !== undefined)
      editableFields.paymentStatus = payload.paymentStatus;
    if (payload.courierName !== undefined) editableFields.courierName = payload.courierName;
    if (payload.trackingCode !== undefined) editableFields.trackingCode = payload.trackingCode;
    if (payload.consignmentId !== undefined) editableFields.consignmentId = payload.consignmentId;
    // ✅ shippingCharge admin edit modal থেকে আসছে, সেটাও যোগ করা দরকার
    if (payload.shippingCharge !== undefined) {
      editableFields.shippingCharge = payload.shippingCharge;
      editableFields.totalAmount =
        order.subtotal - (order.discountAmount || 0) + payload.shippingCharge;
    }
  }

  if (Object.keys(editableFields).length === 0) {
    throw new Error("No valid fields provided to update!");
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    orderID,
    { $set: editableFields },
    { new: true, runValidators: true },
  );

  if (!updatedOrder) {
    throw new Error("Failed to update order — please try again.");
  }

  return updatedOrder;
};


// ===================== COURIER & ORDER FULFILLMENT =====================
const updateCourierInfo = async (
  orderID: string,
  payload: { courierName?: string; trackingCode?: string; consignmentId?: string }
) => {
  const updateData: any = {};
  if (payload.courierName) updateData.courierName = payload.courierName;
  if (payload.trackingCode) updateData.trackingCode = payload.trackingCode;
  if (payload.consignmentId) updateData.consignmentId = payload.consignmentId;

  const order = await Order.findByIdAndUpdate(
    orderID,
    {
      $set: updateData,
      $push: {
        statusTimeline: {
          status: "shipped",
          changedAt: new Date(),
          note: `Courier info updated: ${payload.courierName || "Courier"} (Tracking: ${payload.trackingCode || "N/A"})`,
        },
      },
    },
    { new: true }
  );

  if (!order) throw new Error("Order not found!");
  return order;
};

const adminCreateOrderIntoDB = async (payload: any) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      items,
      userID: selectedUserID, // ✅ admin search করে সিলেক্ট করলে আসবে, নাহলে undefined
      customerName,
      customerPhone,
      deliveryType,
      deliveryAddress,
      paymentMethod,
      paymentStatus,
      deliveryDate,
      deliveryTime,
      specialInstructions,
      shippingCharge: overrideShippingCharge, // ✅ admin চাইলে override করতে পারবে
    } = payload;

    if (!items || items.length === 0) {
      throw new Error("Order must have at least one item!");
    }
    if (!customerName || !customerPhone) {
      throw new Error("Customer name and phone are required!");
    }
    if (deliveryType === "local" && !deliveryAddress?.area) {
      throw new Error("Delivery area is required for local delivery!");
    }

    // ============================================
    // ✅ কোনো fake user তৈরি হচ্ছে না — admin manually যা সিলেক্ট করেছে সেটাই
    // ============================================
    const userID = selectedUserID || undefined;
    const isGuestOrder = !userID;

    // ============================================
    // ✅ Product validate + stock check + price calculation
    // ============================================
    const orderItems: IOrderItem[] = [];
    let subtotal = 0;
    let hasFreeShippingItem = false;

    for (const item of items) {
      const product = await Product.findById(item.productID)
        .populate("unit")
        .session(session);

      if (!product) throw new Error(`Product not found: ${item.productID}`);
      if (product.status !== "active")
        throw new Error(`Product unavailable: ${product.name}`);

      let unitPrice = product.regularPrice;
      let salePrice: number | undefined = product.salePrice;
      let sku: string | undefined = product.sku;
      let unit = (product.unit as any)?.shortName || "pcs";
      let weightOrVolume: number | undefined = product.weightOrVolume;
      let variantID: Types.ObjectId | null = null;

      if (product.productType === "combo") {
        const available = product.stock - (product.reservedStock || 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for combo: ${product.name}`);
        }
        unitPrice = product.regularPrice;
        salePrice = product.salePrice;
      } else if (item.variantID && product.variants?.length) {
        const variant = (product.variants ?? []).find(
          (v: any) => v._id?.toString() === item.variantID?.toString(),
        ) as any;

        if (!variant) throw new Error(`Variant not found for: ${product.name}`);

        const available = variant.stock - (product.reservedStock || 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for variant of: ${product.name}`);
        }

        unitPrice = variant.regularPrice;
        salePrice = variant.salePrice;
        sku = variant.sku || product.sku;
        weightOrVolume = variant.weightOrVolume;
        variantID = variant._id as Types.ObjectId;

        unit = "pcs";
      } else {
        const available = product.stock - (product.reservedStock || 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for: ${product.name}`);
        }
      }

      if ((product as any).isFreeShipping === true) {
        hasFreeShippingItem = true;
      }

      const effectivePrice = salePrice && salePrice > 0 ? salePrice : unitPrice;
      const totalPrice = effectivePrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productID: product._id as Types.ObjectId,
        variantID,
        productName: product.name,
        thumbnail: product.thumbnail,
        sku,
        quantity: item.quantity,
        unit,
        weightOrVolume,
        unitPrice,
        salePrice,
        totalPrice,
        productType: product.productType,
      } as IOrderItem);
    }

    // ============================================
    // ✅ Delivery Date/Time Validation (createOrderIntoDB এর মতোই)
    // ============================================
    let finalDeliveryDate: Date | undefined = undefined;
    let finalDeliveryTime: string | undefined = undefined;

    if (deliveryType === "local" && deliveryDate && deliveryTime) {
      finalDeliveryDate = new Date(deliveryDate);
      finalDeliveryTime = deliveryTime;
    }

    // ============================================
    // ✅ isFirstOrder — শুধু real user থাকলেই মিনিংফুল
    // ============================================
    let isFirstOrder = false;
    if (userID) {
      const orderCount = await Order.countDocuments({ userID }).session(session);
      isFirstOrder = orderCount === 0;
    }

    // ============================================
    // ✅ Dynamic Shipping Charge — DB tiers থেকে, override দিলে সেটা ব্যবহার
    // ============================================
    let shippingCharge: number;
    let riderCommission = 0;
    let commissionPercentage = 0;

    if (overrideShippingCharge !== undefined && overrideShippingCharge !== null) {
      shippingCharge = Number(overrideShippingCharge);
    } else {
      const result = await getShippingAndCommission(
        deliveryType,
        subtotal,
        isFirstOrder,
        hasFreeShippingItem,
        session,
      );
      shippingCharge = result.shippingCharge;
      riderCommission = 0;
      commissionPercentage = 0;
    }

    const totalAmount = subtotal + shippingCharge;

    // ============================================
    // ✅ Order Data — userID থাকলে বসবে, না থাকলে undefined (guest order)
    // ============================================
    const orderData: Partial<IOrder> = {
      userID,
      isGuestOrder,
      items: orderItems,
      subtotal,
      shippingCharge,
      totalAmount,
      deliveryType,
      deliveryAddress: {
        ...deliveryAddress,
        name: customerName,
        phone: customerPhone,
      },
      deliveryDate: finalDeliveryDate,
      deliveryTime: finalDeliveryTime,
      paymentMethod,
      paymentStatus: paymentStatus || "unpaid",
      specialInstructions,
      isOutsideLocation: Boolean(payload.isOutsideLocation),
      orderPlacedCoords: payload.orderPlacedCoords || undefined,
    } as any;

    // ============================================
    // ✅ Create Order
    // ============================================
    const [order] = await Order.create([orderData], { session });

    // ============================================
    // ✅ Reserved Stock Update
    // ============================================
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.productID,
        { $inc: { reservedStock: item.quantity } },
        { session },
      );
    }

    await session.commitTransaction();
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};




export const OrderServices = {
  createOrderIntoDB,
  adminCreateOrderIntoDB,
  getMyOrdersFromDB,
  getSingleOrderFromDB,
  cancelOrderByUser,
  getAllOrdersFromDB,
  updateOrderStatusByAdmin,
  autoExpireOrders,
  getOrderDetailsFromDB,
  updateOrderIntoDB,
  updateCourierInfo,
  trackOrderPublic,
  getOrderStatsForAdmin,
  updatePaymentStatusByAdmin,
  addAdminNoteToOrder,
  processReturnByAdmin,
};
