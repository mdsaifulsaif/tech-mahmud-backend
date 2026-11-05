import mongoose from "mongoose";
import { Category } from "./category.model";
import { Product } from "../product/product.model";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";


const createCategoryIntoDB = async (payload: any, file: any) => {
  // Partial<ICategory> এর বদলে temporary any দিন টেস্টের জন্য
  if (!file) {
    throw new Error("Category image is required!");
  }

  const uploadResult: any = await uploadToCloudinary(
    file.buffer,
    "glowly_categories",
  );
  payload.image = uploadResult.secure_url || uploadResult.url;

  const isExist = await Category.findOne({
    name: payload.name,
    isDeleted: false,
  });

  if (isExist) {
    throw new Error("Category already exists!");
  }

  // ডাটা ক্লিনিং এবং ফরম্যাটিং (এই অংশটি ডাটা মিস হওয়া আটকাবে)
  const finalData = {
    name: payload.name,
    slug:
      payload.slug ||
      payload.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, ""),
    description: payload.description || "",
    parentCategory:
      payload.parentCategory === "" ? null : payload.parentCategory,
    icon: payload.icon || "",
    image: payload.image,
    banner: payload.banner || "",
    // পোস্টম্যান থেকে "true" (string) আসলে সেটাকে true (boolean) করা
    status:
      payload.status === "ture" || payload.status === "active"
        ? "active"
        : "inactive",
    order: payload.order ? Number(payload.order) : 0,
    isFeatured: payload.isFeatured === "true" || payload.isFeatured === true,
    showInHome: payload.showInHome === "true" || payload.showInHome === true,
    showInMenu: payload.showInMenu === "true" || payload.showInMenu === true,
    metaTitle: payload.metaTitle || "",
    metaDescription: payload.metaDescription || "",
  };

  // এবার সরাসরি finalData সেভ করুন
  const result = await Category.create(finalData);
  return result;
};

const updateCategoryIntoDB = async (id: string, payload: any, file: any) => {
  // ১. ক্যাটাগরি ডাটাবেজে আছে কি না চেক করো
  const isExist = await Category.findById(id);
  if (!isExist) {
    throw new Error("Category not found!");
  }

  // ২. যদি নতুন ইমেজ ফাইল আসে, তবে ক্লাউডিনারিতে আপলোড করো
  let imageUrl = isExist.image; // ফাইল না আসলে আগের ইমেজটিই থাকবে
  if (file) {
    const uploadResult: any = await uploadToCloudinary(file.buffer, "glowly_categories");
    imageUrl = uploadResult.secure_url || uploadResult.url;
  }

  // ৩. আপডেট ডাটা ফরম্যাটিং (আপনার ক্রিয়েট লজিকের মতোই)
  const updateData = {
    name: payload.name || isExist.name,
    slug: payload.slug || isExist.slug,
    description: payload.description !== undefined ? payload.description : isExist.description,
    parentCategory: payload.parentCategory === "" || payload.parentCategory === "null" 
                     ? null 
                     : (payload.parentCategory || isExist.parentCategory),
    icon: payload.icon || isExist.icon,
    image: imageUrl, // নতুন ইমেজ ইউআরএল বা পুরনোটি
    banner: payload.banner || isExist.banner,
    status: (payload.status === "active") ? "active" : (payload.status === "inactive" ? "inactive" : isExist.status),
    order: payload.order !== undefined && payload.order !== "" ? Number(payload.order) : isExist.order,
    isFeatured: payload.isFeatured !== undefined ? (payload.isFeatured === "true" || payload.isFeatured === true) : isExist.isFeatured,
    showInHome: payload.showInHome !== undefined ? (payload.showInHome === "true" || payload.showInHome === true) : isExist.showInHome,
    showInMenu: payload.showInMenu !== undefined ? (payload.showInMenu === "true" || payload.showInMenu === true) : isExist.showInMenu,
    metaTitle: payload.metaTitle || isExist.metaTitle,
    metaDescription: payload.metaDescription || isExist.metaDescription,
  };

  // ৪. ডাটাবেজে আপডেট করো
  const result = await Category.findByIdAndUpdate(id, updateData, { new: true });
  return result;
};

const getSingleCategoryFromDB = async (id: string) => {
  const result = await Category.findById(id);
  
  if (!result) {
    throw new Error("Category not found!");
  }
  
  return result;
};

const getAllCategoriesFromDB = async (
  page: number = 1,
  limit: number = 10,
  query: Record<string, any> = {},
) => {
  const skip = (page - 1) * limit;

  // Category matching
  const categoryMatch: any = { isDeleted: false };
  if (query.status) {
    categoryMatch.status = query.status;
  }
  if (query.isFeatured !== undefined) {
    categoryMatch.isFeatured = query.isFeatured === "true" || query.isFeatured === true;
  }
  if (query.showInHome !== undefined) {
    categoryMatch.showInHome = query.showInHome === "true" || query.showInHome === true;
  }
  if (query.searchTerm) {
    categoryMatch.name = { $regex: query.searchTerm, $options: "i" };
  }

  // Product counting:
  // If status='active' (public frontend / HomeCategory), count ONLY active products!
  // Otherwise (Admin dashboard), count ALL products in that category!
  const productMatch: any = {
    $expr: { $eq: ["$categoryID", "$$catId"] },
    isDeleted: { $ne: true },
  };

  if (query.status === "active") {
    productMatch.status = "active";
  }

  const data = await Category.aggregate([
    { $match: categoryMatch },
    {
      $lookup: {
        from: "products",
        let: { catId: "$_id" },
        pipeline: [
          {
            $match: productMatch,
          },
        ],
        as: "productDetails",
      },
    },
    {
      $addFields: {
        productCount: { $size: { $ifNull: ["$productDetails", []] } },
      },
    },
    { $project: { productDetails: 0, __v: 0 } },
    { $sort: { order: 1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  const total = await Category.countDocuments(categoryMatch);

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data,
  };
};

const deleteCategoryFromDB = async (id: string) => {
  return await Category.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
};

const getAllCategoryAndDescendantIds = async (
  categoryIdentifier: string | mongoose.Types.ObjectId,
): Promise<mongoose.Types.ObjectId[]> => {
  try {
    let targetCategory: any = null;
    if (mongoose.Types.ObjectId.isValid(categoryIdentifier)) {
      targetCategory = await Category.findById(categoryIdentifier).select("_id");
    }
    if (!targetCategory && typeof categoryIdentifier === "string") {
      targetCategory = await Category.findOne({ slug: categoryIdentifier }).select("_id");
    }
    if (!targetCategory) return [];

    const allIds: mongoose.Types.ObjectId[] = [new mongoose.Types.ObjectId(targetCategory._id)];

    const getChildrenRecursive = async (parentIds: mongoose.Types.ObjectId[]) => {
      const children = await Category.find({
        parentCategory: { $in: parentIds },
        isDeleted: { $ne: true },
      }).select("_id");

      if (children && children.length > 0) {
        const childIds = children.map((c) => new mongoose.Types.ObjectId(c._id));
        allIds.push(...childIds);
        await getChildrenRecursive(childIds);
      }
    };

    await getChildrenRecursive([new mongoose.Types.ObjectId(targetCategory._id)]);
    return allIds;
  } catch (err) {
    console.error("Error finding descendant category IDs:", err);
    return [];
  }
};

const getProductsByCategoryFromDB = async (
  categoryId: string,
  page: number = 1,
  limit: number = 10,
) => {
  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: false,
  });

  if (!category) {
    throw new Error("Category not found or deleted!");
  }

  const descendantIds = await getAllCategoryAndDescendantIds(category._id);
  const catFilter = descendantIds.length > 0 ? { $in: descendantIds } : categoryId;

  const skip = (page - 1) * limit;

  const data = await Product.find({
    categoryID: catFilter,
    isDeleted: { $ne: true },
    status: "active",
  })
    .skip(skip)
    .limit(limit)
    .populate("categoryID");

  const total = await Product.countDocuments({
    categoryID: catFilter,
    isDeleted: { $ne: true },
    status: "active",
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data,
  };
};

const toggleFeaturedCategoryIntoDB = async (id: string) => {
  const isExist = await Category.findById(id);
  if (!isExist) {
    throw new Error("Category not found!");
  }
  isExist.isFeatured = !isExist.isFeatured;
  await isExist.save();
  return isExist;
};

const toggleShowInHomeCategoryIntoDB = async (id: string) => {
  const isExist = await Category.findById(id);
  if (!isExist) {
    throw new Error("Category not found!");
  }
  isExist.showInHome = !isExist.showInHome;
  await isExist.save();
  return isExist;
};

export const CategoryServices = {
  createCategoryIntoDB,
  updateCategoryIntoDB,
  getSingleCategoryFromDB,
  getAllCategoriesFromDB,
  deleteCategoryFromDB,
  getProductsByCategoryFromDB,
  toggleFeaturedCategoryIntoDB,
  toggleShowInHomeCategoryIntoDB,
  getAllCategoryAndDescendantIds,
};
