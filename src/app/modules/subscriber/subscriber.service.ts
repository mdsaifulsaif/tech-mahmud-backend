import { ISubscriber } from "./subscriber.interface";
import { Subscriber } from "./subscriber.model";

const addSubscriberToDB = async (payload: ISubscriber) => {
  const isSubscriberExist = await Subscriber.findOne({ email: payload.email });

  if (isSubscriberExist) {
    throw new Error("You have already subscribed with this email!");
  }
  const result = await Subscriber.create(payload);
  return result;
};

const getAllSubscribersFromDB = async (query: Record<string, any>) => {
  const {
    page = 1,
    limit = 10,
    search,
    searchTerm,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  const filter: any = {};

  const searchStr = (searchTerm || search || "").trim();
  if (searchStr) {
    filter.email = { $regex: searchStr, $options: "i" };
  }

  if (status && status !== "all") {
    filter.status = status;
  }

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sortStage: any = {};
  sortStage[sortBy] = sortDirection;

  const [data, total] = await Promise.all([
    Subscriber.find(filter).sort(sortStage).skip(skip).limit(limitNum).lean(),
    Subscriber.countDocuments(filter),
  ]);

  const totalPage = Math.ceil(total / limitNum) || 1;

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPage,
      totalPages: totalPage,
    },
    data,
  };
};

const getSubscriberStatsFromDB = async () => {
  const firstDayOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const [total, active, unsubscribed, newThisMonth] = await Promise.all([
    Subscriber.countDocuments(),
    Subscriber.countDocuments({ status: "active" }),
    Subscriber.countDocuments({ status: "unsubscribed" }),
    Subscriber.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
  ]);

  return {
    total,
    active,
    unsubscribed,
    newThisMonth,
  };
};

const toggleSubscriberStatusInDB = async (id: string, status?: string) => {
  const subscriber = await Subscriber.findById(id);
  if (!subscriber) {
    const error: any = new Error("Subscriber not found");
    error.statusCode = 404;
    throw error;
  }

  const newStatus = status || (subscriber.status === "active" ? "unsubscribed" : "active");
  subscriber.status = newStatus as "active" | "unsubscribed";
  await subscriber.save();
  return subscriber;
};

const deleteSubscriberFromDB = async (id: string) => {
  const deleted = await Subscriber.findByIdAndDelete(id);
  if (!deleted) {
    const error: any = new Error("Subscriber not found");
    error.statusCode = 404;
    throw error;
  }
  return deleted;
};

export const SubscriberServices = {
  addSubscriberToDB,
  getAllSubscribersFromDB,
  getSubscriberStatsFromDB,
  toggleSubscriberStatusInDB,
  deleteSubscriberFromDB,
};