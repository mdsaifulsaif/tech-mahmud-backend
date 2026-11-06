import { IBanner } from "./banner.interface";
import { Banner } from "./banner.model";

const createBannerToDB = async (payload: IBanner) => {
  const result = await Banner.create(payload);
  return result;
};

const getActiveBannersForClient = async (placement?: string) => {
  const filter: any = {
    isActive: true,
    isDeleted: { $ne: true },
  };
  if (placement) {
    filter.placement = placement;
  }

  const result = await Banner.find(filter)
    .populate("categoryID", "name slug")
    .sort({ order: 1, createdAt: -1 });
  return result;
};

const getAllBannersForAdmin = async (placement?: string) => {
  const filter: any = {
    isDeleted: { $ne: true },
  };
  if (placement) {
    filter.placement = placement;
  }

  const result = await Banner.find(filter)
    .populate("categoryID", "name slug")
    .sort({ order: 1, createdAt: -1 });
  return result;
};

const getBannerByIdFromDB = async (id: string) => {
  const result = await Banner.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate("categoryID", "name slug");
  if (!result) {
    throw new Error("Banner not found");
  }
  return result;
};

const updateBannerInDB = async (id: string, payload: Partial<IBanner>) => {
  const isExist = await Banner.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!isExist) {
    throw new Error("Banner not found");
  }

  const result = await Banner.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteBannerFromDB = async (id: string) => {
  const isExist = await Banner.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!isExist) {
    throw new Error("Banner not found");
  }

  const result = await Banner.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

  return result;
};

export const BannerServices = {
  createBannerToDB,
  getActiveBannersForClient,
  getAllBannersForAdmin,
  getBannerByIdFromDB,
  updateBannerInDB,
  deleteBannerFromDB,
};
