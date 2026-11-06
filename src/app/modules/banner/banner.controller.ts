import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { BannerServices } from "./banner.service";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

const createBanner = catchAsync(async (req: Request, res: Response) => {
  let imageUrl = req.body.image;
  if (req.file) {
    const uploadResult: any = await uploadToCloudinary(
      req.file.buffer,
      "tech_mahmud_banners"
    );
    imageUrl = uploadResult?.url || imageUrl;
  }

  const payload: any = {
    ...req.body,
    image: imageUrl,
    placement: req.body.placement || "slider",
    isActive:
      req.body.isActive === "false" || req.body.isActive === false
        ? false
        : true,
    order: req.body.order ? Number(req.body.order) : 0,
  };

  if (!payload.categoryID || payload.categoryID === "" || payload.categoryID === "null") {
    payload.categoryID = null;
  }

  const result = await BannerServices.createBannerToDB(payload);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Banner created successfully",
    data: result,
  });
});

const getActiveBanners = catchAsync(async (req: Request, res: Response) => {
  const placement = req.query.placement as string | undefined;
  const result = await BannerServices.getActiveBannersForClient(placement);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Active banners retrieved successfully",
    data: result,
  });
});

const getAllBanners = catchAsync(async (req: Request, res: Response) => {
  const placement = req.query.placement as string | undefined;
  const result = await BannerServices.getAllBannersForAdmin(placement);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All banners retrieved successfully",
    data: result,
  });
});

const getBannerById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BannerServices.getBannerByIdFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Banner retrieved successfully",
    data: result,
  });
});

const updateBanner = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: any = { ...req.body };

  if (req.file) {
    const uploadResult: any = await uploadToCloudinary(
      req.file.buffer,
      "tech_mahmud_banners"
    );
    updateData.image = uploadResult?.url;
  }

  if (updateData.placement) {
    updateData.placement = updateData.placement;
  }

  if (updateData.order !== undefined && updateData.order !== "") {
    updateData.order = Number(updateData.order);
  }
  if (updateData.isActive !== undefined) {
    updateData.isActive =
      updateData.isActive === "true" || updateData.isActive === true;
  }

  if (updateData.categoryID === "" || updateData.categoryID === "null") {
    updateData.categoryID = null;
  }

  const result = await BannerServices.updateBannerInDB(id as string, updateData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Banner updated successfully",
    data: result,
  });
});

const deleteBanner = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BannerServices.deleteBannerFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Banner deleted successfully",
    data: result,
  });
});

export const BannerControllers = {
  createBanner,
  getActiveBanners,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
};
