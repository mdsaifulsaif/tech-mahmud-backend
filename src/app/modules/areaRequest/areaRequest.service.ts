import { IAreaRequest, AreaRequestStatus } from "./areaRequest.interface";
import { AreaRequest } from "./areaRequest.model";

/**
 * Create a new area delivery request
 */
const createAreaRequestToDB = async (payload: Partial<IAreaRequest>) => {
  const result = await AreaRequest.create(payload);
  return result;
};

/**
 * Get all area requests with pagination, status filtering, and search
 */
const getAllAreaRequestsFromDB = async (query: Record<string, any>) => {
  const {
    searchTerm,
    search,
    status,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  const filter: any = {};

  const searchStr = (searchTerm || search || "").trim();
  if (searchStr) {
    filter.$or = [
      { areaName: { $regex: searchStr, $options: "i" } },
      { name: { $regex: searchStr, $options: "i" } },
      { phone: { $regex: searchStr, $options: "i" } },
      { email: { $regex: searchStr, $options: "i" } },
      { city: { $regex: searchStr, $options: "i" } },
    ];
  }

  if (status && status !== "all") {
    filter.status = status;
  }

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const sortStage: any = {};
  sortStage[sortBy] = sortDirection;

  const [data, total] = await Promise.all([
    AreaRequest.find(filter).sort(sortStage).skip(skip).limit(limitNum).lean(),
    AreaRequest.countDocuments(filter),
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

/**
 * Get overview stats for area requests
 */
const getAreaRequestStatsFromDB = async () => {
  const [total, pending, reviewed, approved, rejected] = await Promise.all([
    AreaRequest.countDocuments(),
    AreaRequest.countDocuments({ status: "pending" }),
    AreaRequest.countDocuments({ status: "reviewed" }),
    AreaRequest.countDocuments({ status: "approved" }),
    AreaRequest.countDocuments({ status: "rejected" }),
  ]);

  return {
    total,
    pending,
    reviewed,
    approved,
    rejected,
  };
};

/**
 * Update request status and admin notes
 */
const updateAreaRequestStatusInDB = async (
  id: string,
  payload: { status?: AreaRequestStatus; adminNotes?: string }
) => {
  const updated = await AreaRequest.findByIdAndUpdate(id, payload, { new: true });
  if (!updated) {
    const error: any = new Error("Area request not found");
    error.statusCode = 404;
    throw error;
  }
  return updated;
};

/**
 * Delete an area request
 */
const deleteAreaRequestFromDB = async (id: string) => {
  const deleted = await AreaRequest.findByIdAndDelete(id);
  if (!deleted) {
    const error: any = new Error("Area request not found");
    error.statusCode = 404;
    throw error;
  }
  return deleted;
};

export const AreaRequestServices = {
  createAreaRequestToDB,
  getAllAreaRequestsFromDB,
  getAreaRequestStatsFromDB,
  updateAreaRequestStatusInDB,
  deleteAreaRequestFromDB,
};
