import mongoose from "mongoose";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { Brand } from "./brand.model";
import { cleanSlug } from "../../utils/slugify";


/**
 * ১. ব্র্যান্ড ক্রিয়েট করার সার্ভিস
 */
const createBrandIntoDB = async (payload: any, file: any) => {
  if (!file) throw new Error("Brand logo is required!");

  const uploadResult: any = await uploadToCloudinary(file.buffer, "glowly_brands");
  const imageUrl = uploadResult.secure_url || uploadResult.url;

  const isExist = await Brand.findOne({ name: payload.name, isDeleted: false });
  if (isExist) throw new Error("Brand already exists!");

  // ডাটা ফরম্যাটিং
  const finalData = {
    ...payload,
    logo: imageUrl,
    slug: cleanSlug(payload.slug || payload.name),
    status: payload.status === "active" ? "active" : "inactive",
    isFeatured: payload.isFeatured === "true" || payload.isFeatured === true,
    showInHome: payload.showInHome === "true" || payload.showInHome === true,
    showInMenu: payload.showInMenu === "true" || payload.showInMenu === true,
    order: Number(payload.order) || 0,
  };

  return await Brand.create(finalData);
};

// const updateBrandInDB = async (id: string, payload: any, file: any) => {
//   const brand = await Brand.findById(id);
//   if (!brand || brand.isDeleted) throw new Error("Brand not found!");

//   // নতুন ইমেজ থাকলে আপডেট
//   if (file) {
//     const uploadResult: any = await uploadToCloudinary(file.buffer, "glowly_brands");
//     payload.logo = uploadResult.secure_url;
//   }

//   // বুলিয়ান এবং অন্যান্য কনভার্সন
//   const updateData = {
//     ...payload,
//     isFeatured: payload.isFeatured === "true" || payload.isFeatured === true,
//     showInHome: payload.showInHome === "true" || payload.showInHome === true,
//     showInMenu: payload.showInMenu === "true" || payload.showInMenu === true,
//     order: payload.order ? Number(payload.order) : brand.order,
//   };

//   return await Brand.findByIdAndUpdate(id, updateData, { new: true });
// };


const updateBrandInDB = async (
  id: string,
  payload: any,
  file: any
) => {
  // ১. Brand আছে কিনা চেক
  const isExist = await Brand.findById(id);

  if (!isExist || isExist.isDeleted) {
    throw new Error("Brand not found!");
  }

  // ২. নতুন logo থাকলে upload করো
  let logoUrl = isExist.logo;

  if (file) {
    const uploadResult: any = await uploadToCloudinary(
      file.buffer,
      "glowly_brands"
    );

    logoUrl = uploadResult.secure_url || uploadResult.url;
  }

  // ৩. Update data (Create-এর মতোই)
  const updateData = {
    name: payload.name || isExist.name,
    slug: payload.slug
      ? cleanSlug(payload.slug)
      : payload.name
        ? cleanSlug(payload.name)
        : isExist.slug,
    logo: logoUrl,
    description:
      payload.description !== undefined
        ? payload.description
        : isExist.description,
    status:
      payload.status === "active"
        ? "active"
        : payload.status === "inactive"
        ? "inactive"
        : isExist.status,
    isFeatured:
      payload.isFeatured !== undefined
        ? payload.isFeatured === "true" || payload.isFeatured === true
        : isExist.isFeatured,
    showInHome:
      payload.showInHome !== undefined
        ? payload.showInHome === "true" || payload.showInHome === true
        : isExist.showInHome,
    showInMenu:
      payload.showInMenu !== undefined
        ? payload.showInMenu === "true" || payload.showInMenu === true
        : isExist.showInMenu,
    order:
      payload.order !== undefined
        ? Number(payload.order)
        : isExist.order,
    metaTitle:
      payload.metaTitle !== undefined
        ? payload.metaTitle
        : isExist.metaTitle,
    metaDescription:
      payload.metaDescription !== undefined
        ? payload.metaDescription
        : isExist.metaDescription,
  };

  // ৪. Update
  const result = await Brand.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  return result;
};


/**
 * ২. সব ব্র্যান্ড গেট করা (পেজিনেশন ও সার্চিংসহ)
 */
const getAllBrandsFromDB = async (query: any) => {
  const { page = 1, limit = 10, searchTerm } = query;
  
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // ১. সার্চিং এবং ফিল্টারিং স্টেজ
  const matchStage: any = { isDeleted: false };
  if (query.status) {
    matchStage.status = query.status;
  }
  if (searchTerm) {
    matchStage.name = { $regex: searchTerm, $options: "i" };
  }

  // ২. প্রোডাক্ট কাউন্ট ম্যাচিং (status=active হলে শুধু active প্রোডাক্ট, নাহলে সব)
  const productMatch: any = {
    $expr: {
      $or: [
        { $eq: ["$brandID", "$$brandId"] },
        { $eq: [{ $toString: "$brandID" }, { $toString: "$$brandId" }] },
        { $eq: ["$brand", "$$brandId"] },
        { $eq: [{ $toString: "$brand" }, { $toString: "$$brandId" }] },
      ],
    },
    isDeleted: { $ne: true },
  };

  if (query.status === "active") {
    productMatch.status = "active";
  }

  // ৩. মেইন অ্যাগ্রিগেশন পাইপলাইন
  const data = await Brand.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: "products",
        let: { brandId: "$_id" },
        pipeline: [{ $match: productMatch }],
        as: "products",
      },
    },
    {
      $addFields: {
        productCount: { $size: { $ifNull: ["$products", []] } },
      },
    },
    { $project: { products: 0, __v: 0 } },
    { $sort: { order: 1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limitNum },
  ]);

  const totalResult = await Brand.aggregate([
    { $match: matchStage },
    { $count: "total" },
  ]);

  const total = totalResult.length > 0 ? totalResult[0].total : 0;

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPage: Math.ceil(total / limitNum),
    },
    data,
  };
};

const getSingleBrandFromDB = async (id: string) => {
  const brandObjectId = new mongoose.Types.ObjectId(id);

  const result = await Brand.aggregate([
    { $match: { _id: brandObjectId, isDeleted: false } },
    {
      $lookup: {
        from: "products",
        let: { brandId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ["$brandID", "$$brandId"] },
                  { $eq: [{ $toString: "$brandID" }, { $toString: "$$brandId" }] },
                ],
              },
              isDeleted: { $ne: true },
            },
          },
        ],
        as: "products",
      },
    },
    {
      $addFields: {
        productCount: { $size: { $ifNull: ["$products", []] } },
      },
    },
    { $project: { products: 0, __v: 0 } },
  ]);

  if (!result || result.length === 0) {
    throw new Error("Brand not found!");
  }

  return result[0];
};

/**
 * ৪. ব্র্যান্ড ডিলিট (সফট ডিলিট)
 */
const deleteBrandFromDB = async (id: string) => {
  const result = await Brand.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  if (!result) throw new Error("Brand not found!");
  return result;
};




export const BrandServices = {
  createBrandIntoDB,
  getAllBrandsFromDB,
  getSingleBrandFromDB,
  updateBrandInDB,
  deleteBrandFromDB,
};