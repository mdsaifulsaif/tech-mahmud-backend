import { GetProductsParams, IProduct } from "./product.interface";
import { Product } from "./product.model";
import slugify from "slugify";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import mongoose, { PipelineStage } from "mongoose";
import cloudinary from "../../config/cloudinary";
import { Category } from "../category/category.model";
import { CategoryServices } from "../category/category.service";
import { Brand } from "../brand/brand.model";

// ===================== CREATE =====================
const createProductIntoDB = async (body: Record<string, any>, files: any) => {
  const {
    name,
    shortDescription,
    description,
    categoryID,
    stock,
    unit,
    productType,
  } = body;

  // ১. variants parse আগে
  let variants: any[] = [];
  try {
    if (body.variants) variants = JSON.parse(body.variants);
  } catch {
    throw new Error("Invalid JSON format for variants.");
  }

  // ২. বাকি JSON parse
  let comboItems: any[] = [];
  let tags: string[] = [];
  let lowdown: string[] = [];
  let specifications: any[] = [];
  let warranty: any = undefined;

  try {
    if (body.comboItems) comboItems = JSON.parse(body.comboItems);
    if (body.tags) tags = JSON.parse(body.tags);
    if (body.lowdown) lowdown = JSON.parse(body.lowdown);
    if (body.specifications) specifications = JSON.parse(body.specifications);
    if (body.warranty) {
      warranty = typeof body.warranty === "string" ? JSON.parse(body.warranty) : body.warranty;
    }
  } catch {
    throw new Error("Invalid JSON format for array or object fields.");
  }

  const hasVariants = variants && variants.length > 0;
  const isCombo = productType === "combo";
  const isSingle = !isCombo;

  // ৩. required field validation
  if (!name || !shortDescription || !categoryID) {
    throw new Error("Please provide: name, shortDescription, categoryID.");
  }

  // ✅ single product (no variant) এ price ও stock required
  if (isSingle && !hasVariants) {
    if (!body.regularPrice) throw new Error("Regular price is required.");
    if (stock === undefined || stock === null)
      throw new Error("Stock is required.");
  }

  // ৪. variant validation
  if (hasVariants) {
    const seen = new Set<string>();
    for (const variant of variants) {
      if (!variant.regularPrice || Number(variant.regularPrice) <= 0)
        throw new Error(`একটি variant এ regularPrice দেওয়া হয়নি বা শূন্য।`);
      if (variant.stock === undefined || variant.stock === null)
        throw new Error(`একটি variant এ stock দেওয়া হয়নি।`);

      const colorKey = variant.attributes?.color?.name || "";
      const sizeKey = variant.attributes?.size || "";
      const storageKey = variant.attributes?.storage || "";
      const variantNameKey = variant.variantName || variant.sku || "";
      const key = variant.sku || `${colorKey}_${sizeKey}_${storageKey}_${variantNameKey}`.trim();
      if (key && seen.has(key)) throw new Error(`Duplicate variant found: ${key}`);
      if (key) seen.add(key);
    }
  }

  // ৫. price calculate
  const cost = isCombo
    ? Number(body.costPrice) || 0
    : hasVariants
      ? 0
      : Number(body.costPrice) || 0;

  const regular = isCombo
    ? Number(body.regularPrice) || 0
    : hasVariants
      ? Number(variants[0]?.regularPrice || 0)
      : Number(body.regularPrice) || 0;

  const qty = isCombo
    ? Number(stock) || 0
    : hasVariants
      ? variants.reduce(
          (total: number, v: any) => total + Number(v.stock || 0),
          0,
        )
      : Number(stock) || 0;

  const sale = body.salePrice ? Number(body.salePrice) : undefined;

  // ৬. price validation — শুধু single (no variant) এ
  if (isSingle && !hasVariants) {
    if (regular <= 0)
      throw new Error("Regular price must be greater than zero.");
    if (sale && sale >= regular)
      throw new Error("Sale price must be less than regular price.");
  }

  // ৭. combo validation + selectedVariant clean
  if (isCombo) {
    if (!comboItems || comboItems.length === 0) {
      throw new Error("Combo product must have at least one item.");
    }

    // ✅ selectedVariant empty string → null
    comboItems = comboItems.map((item: any) => ({
      ...item,
      selectedVariant:
        item.selectedVariant && item.selectedVariant !== ""
          ? item.selectedVariant
          : null,
    }));

    for (const item of comboItems) {
      if (!item.productID)
        throw new Error("Each combo item must have productID.");
      const dbProduct = await Product.findById(item.productID);
      if (!dbProduct) throw new Error(`Product not found: ${item.productID}`);
      const requiredQty = Number(item.quantity || 1);

      if (item.selectedVariant) {
        const targetVariant = dbProduct.variants?.find(
          (v: any) => v._id?.toString() === item.selectedVariant,
        );
        if (!targetVariant) throw new Error(`Variant not found.`);
        if (Number(targetVariant.stock) <= 0)
          throw new Error(`Variant is Out of Stock.`);
        if (requiredQty > Number(targetVariant.stock))
          throw new Error(`Insufficient stock for variant.`);
      } else {
        const available = dbProduct.stock - (dbProduct.reservedStock || 0);
        if (available <= 0)
          throw new Error(`"${dbProduct.name}" is Out of Stock.`);
        if (requiredQty > available)
          throw new Error(`Insufficient stock for "${dbProduct.name}".`);
      }
    }
  }

  // ৮. dimensions
  const dimensions =
    body.length || body.width || body.height
      ? {
          length: body.length ? Number(body.length) : undefined,
          width: body.width ? Number(body.width) : undefined,
          height: body.height ? Number(body.height) : undefined,
        }
      : undefined;

  // ৯. payload
  const productData: Partial<IProduct> = {
    name,
    shortDescription,
    description,
    categoryID,
    productType: productType || "single",
    costPrice: cost,
    regularPrice: regular,
    salePrice: sale,
    stock: qty,

    // ✅ unit — single product এ body থেকে, combo/variant এ null
    unit: isSingle && !hasVariants && unit ? unit : null,

    // ✅ weightOrVolume — শুধু single product এ
    ...(isSingle &&
      !hasVariants &&
      body.weightOrVolume && {
        weightOrVolume: Number(body.weightOrVolume),
      }),

    sku: body.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    lowStockAlert: body.lowStockAlert ? Number(body.lowStockAlert) : 10,

    // ✅ brandID — combo তে nonebrand
    brandID: isCombo ? "nonebrand" : body.brandID || "nonebrand",

    hasVariants,
    subCategoryID: body.subCategoryID || null,
    warranty: warranty || { hasWarranty: false },
    sizeGuide: body.sizeGuide || "",
    tags,
    lowdown,
    variants,
    comboItems,
    specifications,
    weight: body.weight ? Number(body.weight) : undefined,
    shippingCost: body.shippingCost ? Number(body.shippingCost) : 0,
    freeShipping: body.freeShipping === "true",
    isFeatured: body.isFeatured === "true" || body.isFeatured === true,
    isOnSale: body.isOnSale === "true" || body.isOnSale === true,
    isNew: body.isNew !== "false" && body.isNew !== false,
    isNewCollection: body.isNewCollection === "true" || body.isNewCollection === true,
    status: body.status || "active",
    metaTitle: body.metaTitle || "",
    metaDescription: body.metaDescription || "",
    dimensions,
  };

  // ১০. thumbnail upload
  const thumbnailFiles = files?.thumbnail;
  if (thumbnailFiles && thumbnailFiles[0]) {
    const result: any = await uploadToCloudinary(
      thumbnailFiles[0].buffer,
      "glowly_products/thumbnails",
    );
    productData.thumbnail = result.secure_url || result.url;
  } else {
    throw new Error("Product thumbnail is required!");
  }

  // ১১. gallery upload
  const galleryFiles = files?.images;
  if (galleryFiles && galleryFiles.length > 0) {
    const uploadResults: any[] = await Promise.all(
      galleryFiles.map((file: any) =>
        uploadToCloudinary(file.buffer, "glowly_products/gallery"),
      ),
    );
    productData.images = uploadResults.map((res) => res.secure_url || res.url);
  }

  return await Product.create(productData);
};

// ===================== UPDATE =====================
const updateProductIntoDB = async (
  id: string,
  body: Record<string, any>,
  files: any,
) => {
  const existingProduct = await Product.findById(id);
  if (!existingProduct) throw new Error("Product not found!");

  // ১. variants parse
  let variants: any[] = (existingProduct.variants ?? []) as any[];
  try {
    if (body.variants) variants = JSON.parse(body.variants);
  } catch {
    throw new Error("Invalid JSON format for variants.");
  }

  const hasVariants = variants && variants.length > 0;
  const isCombo = (body.productType || existingProduct.productType) === "combo";

  // ২. variant validation
  if (hasVariants) {
    const seen = new Set<string>();
    for (const variant of variants) {
      if (!variant.regularPrice || Number(variant.regularPrice) <= 0)
        throw new Error(`একটি variant এ regularPrice দেওয়া হয়নি বা শূন্য।`);
      if (variant.stock === undefined || variant.stock === null)
        throw new Error(`একটি variant এ stock দেওয়া হয়নি।`);

      const colorKey = variant.attributes?.color?.name || "";
      const sizeKey = variant.attributes?.size || "";
      const storageKey = variant.attributes?.storage || "";
      const variantNameKey = variant.variantName || variant.sku || "";
      const key = variant.sku || `${colorKey}_${sizeKey}_${storageKey}_${variantNameKey}`.trim();
      if (key && seen.has(key)) throw new Error(`Duplicate variant found: ${key}`);
      if (key) seen.add(key);
    }
  }

  // ৩. price validation (single product only)
  if (!hasVariants && !isCombo && (body.regularPrice || body.costPrice)) {
    const cost = Number(body.costPrice || existingProduct.costPrice);
    const regular = Number(body.regularPrice || existingProduct.regularPrice);
    const sale =
      body.salePrice !== undefined
        ? Number(body.salePrice)
        : existingProduct.salePrice;

    if (regular <= 0)
      throw new Error("Regular price must be greater than zero.");
    if (sale && sale >= regular)
      throw new Error("Sale price must be less than regular price.");
  }

  // ৪. JSON parse
  let tags = existingProduct.tags;
  let lowdown = existingProduct.lowdown;
  let comboItems: any[] = (existingProduct.comboItems ?? []) as any[];
  let specifications = existingProduct.specifications;
  let warranty = existingProduct.warranty;

  try {
    if (body.tags) tags = JSON.parse(body.tags);
    if (body.lowdown) lowdown = JSON.parse(body.lowdown);
    if (body.comboItems) comboItems = JSON.parse(body.comboItems);
    if (body.specifications) specifications = JSON.parse(body.specifications);
    if (body.warranty) {
      warranty = typeof body.warranty === "string" ? JSON.parse(body.warranty) : body.warranty;
    }
  } catch {
    throw new Error("Invalid JSON format for array or object fields.");
  }

  // ৫. combo validation + selectedVariant clean
  const productType = body.productType || existingProduct.productType;
  if (productType === "combo" && body.comboItems) {
    // ✅ selectedVariant empty string → null
    comboItems = comboItems.map((item: any) => ({
      ...item,
      selectedVariant:
        item.selectedVariant && item.selectedVariant !== ""
          ? item.selectedVariant
          : null,
    }));

    if (!comboItems || comboItems.length === 0)
      throw new Error("Combo must have at least one item.");

    for (const item of comboItems) {
      if (!item.productID)
        throw new Error("Each combo item must have productID.");
      const dbProduct = await Product.findById(item.productID);
      if (!dbProduct) throw new Error(`Product not found: ${item.productID}`);
      const requiredQty = Number(item.quantity || 1);
      const available = dbProduct.stock - (dbProduct.reservedStock || 0);
      if (available <= 0)
        throw new Error(`"${dbProduct.name}" is Out of Stock.`);
      if (requiredQty > available)
        throw new Error(`Insufficient stock for "${dbProduct.name}".`);
    }
  }

  // ৬. dimensions
  const dimensions =
    body.length || body.width || body.height
      ? {
          length: body.length
            ? Number(body.length)
            : existingProduct.dimensions?.length,
          width: body.width
            ? Number(body.width)
            : existingProduct.dimensions?.width,
          height: body.height
            ? Number(body.height)
            : existingProduct.dimensions?.height,
        }
      : existingProduct.dimensions;

  // ৭. update payload
  const updateData: Partial<IProduct> = {
    ...(body.name && { name: body.name }),
    ...(body.shortDescription && { shortDescription: body.shortDescription }),
    ...(body.description && { description: body.description }),
    ...(body.categoryID && { categoryID: body.categoryID }),
    ...(body.productType && { productType: body.productType }),

    // ✅ unit — single (no variant) এ update, অন্যথায় null
    unit:
      !hasVariants && !isCombo && body.unit ? body.unit : existingProduct.unit,

    // ✅ brandID — combo তে nonebrand
    brandID: isCombo ? "nonebrand" : body.brandID || existingProduct.brandID,

    // ✅ costPrice
    costPrice: hasVariants
      ? 0
      : isCombo
        ? Number(body.costPrice) || existingProduct.costPrice
        : body.costPrice
          ? Number(body.costPrice)
          : existingProduct.costPrice,

    // ✅ regularPrice
    regularPrice: hasVariants
      ? Number(variants[0]?.regularPrice || existingProduct.regularPrice)
      : body.regularPrice
        ? Number(body.regularPrice)
        : existingProduct.regularPrice,

    // ✅ stock
    stock: hasVariants
      ? variants.reduce(
          (total: number, v: any) => total + Number(v.stock || 0),
          0,
        )
      : body.stock !== undefined
        ? Number(body.stock)
        : existingProduct.stock,

    // ✅ weightOrVolume — single product এ
    ...(!hasVariants &&
      !isCombo &&
      body.weightOrVolume && {
        weightOrVolume: Number(body.weightOrVolume),
      }),

    // ✅ salePrice
    salePrice: hasVariants
      ? variants[0]?.salePrice
        ? Number(variants[0].salePrice)
        : undefined
      : body.salePrice !== undefined
        ? Number(body.salePrice)
        : existingProduct.salePrice,

    ...(body.sku && { sku: body.sku }),
    ...(body.lowStockAlert !== undefined && {
      lowStockAlert: Number(body.lowStockAlert),
    }),
    ...(body.weight !== undefined && { weight: Number(body.weight) }),
    ...(body.shippingCost !== undefined && {
      shippingCost: Number(body.shippingCost),
    }),
    ...(body.shippingClass && { shippingClass: body.shippingClass }),
    ...(body.freeShipping !== undefined && {
      freeShipping: body.freeShipping === "true",
    }),
    ...(body.isFeatured !== undefined && {
      isFeatured: body.isFeatured === "true" || body.isFeatured === true,
    }),
    ...(body.isOnSale !== undefined && { isOnSale: body.isOnSale === "true" || body.isOnSale === true }),
    ...(body.isNew !== undefined && { isNew: body.isNew === "true" || body.isNew === true }),
    ...(body.isNewCollection !== undefined && {
      isNewCollection: body.isNewCollection === "true" || body.isNewCollection === true,
    }),
    ...(body.status && { status: body.status }),
    ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle }),
    ...(body.metaDescription !== undefined && {
      metaDescription: body.metaDescription,
    }),
    ...(body.straight_up !== undefined && { straight_up: body.straight_up }),
    hasVariants,
    subCategoryID: body.subCategoryID || null,
    warranty: warranty || { hasWarranty: false },
    sizeGuide: body.sizeGuide || "",
    tags,
    lowdown,
    variants,
    comboItems,
    specifications,
    dimensions,
  };

  // ৮. thumbnail update
  const thumbnailFiles = files?.thumbnail;
  if (thumbnailFiles && thumbnailFiles[0]) {
    if (existingProduct.thumbnail) {
      const publicId = existingProduct.thumbnail
        .split("/")
        .slice(-2)
        .join("/")
        .replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId);
    }
    const result: any = await uploadToCloudinary(
      thumbnailFiles[0].buffer,
      "glowly_products/thumbnails",
    );
    updateData.thumbnail = result.secure_url || result.url;
  }

  // ৯. gallery update
  const galleryFiles = files?.images;
  if (galleryFiles && galleryFiles.length > 0) {
    if (existingProduct.images && existingProduct.images.length > 0) {
      await Promise.all(
        existingProduct.images.map((imgUrl: string) => {
          const publicId = imgUrl
            .split("/")
            .slice(-2)
            .join("/")
            .replace(/\.[^/.]+$/, "");
          return cloudinary.uploader.destroy(publicId);
        }),
      );
    }
    const uploadResults: any[] = await Promise.all(
      galleryFiles.map((file: any) =>
        uploadToCloudinary(file.buffer, "glowly_products/gallery"),
      ),
    );
    updateData.images = uploadResults.map((res) => res.secure_url || res.url);
  }

  return await Product.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true },
  ).populate("categoryID", "name image");
};

// const getAllProductsFromDB = async (query: Record<string, any>) => {
//   const {
//     searchTerm,
//     category,
//     productType,
//     status,
//     isFeatured,
//     page = 1,
//     limit = 8,

//     sort = "-createdAt",
//   } = query;

//   const pageNum = Number(page);
//   const limitNum = Number(limit);
//   const safeLimit = limitNum > 0 ? limitNum : 10;

//   const matchStage: any = {};
//   if (searchTerm) {
//     matchStage.$or = [
//       { name: { $regex: searchTerm, $options: "i" } },
//       { description: { $regex: searchTerm, $options: "i" } },
//     ];
//   }
//   if (category) matchStage.categoryID = category;
//   if (productType) matchStage.productType = productType;
//   if (status) matchStage.status = status;
//   if (isFeatured !== undefined) matchStage.isFeatured = isFeatured === "true";

//   // সমাধান: Facet এর ভেতরের স্টেজগুলোকে 'any' হিসেবে চিহ্নিত করা যাতে টাইপ এরর না আসে
//   const pipeline: PipelineStage[] = [
//     { $match: matchStage },
//     {
//       $facet: {
//         data: [
//           { $sort: { [sort.replace("-", "")]: sort.startsWith("-") ? -1 : 1 } },
//           { $skip: (pageNum - 1) * limitNum },
//           { $limit: limitNum },
//           {
//             $lookup: {
//               from: "categories",
//               localField: "categoryID",
//               foreignField: "_id",
//               as: "categoryID",
//             },
//           },
//           {
//             $unwind: { path: "$categoryID", preserveNullAndEmptyArrays: true },
//           },
//         ] as any, // 👈 এখানে 'as any' ব্যবহার করলে এরর চলে যাবে
//         metaCounts: [
//           {
//             $group: {
//               _id: null,
//               total: { $sum: 1 },
//               active: {
//                 $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
//               },
//               inactive: {
//                 $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
//               },
//               lowStock: {
//                 $sum: { $cond: [{ $lte: ["$stock", "$lowStockAlert"] }, 1, 0] },
//               },
//               featured: { $sum: { $cond: ["$isFeatured", 1, 0] } },
//             },
//           },
//         ] as any, // 👈 এখানে 'as any' ব্যবহার করুন
//       },
//     },
//   ];

//   const result = await Product.aggregate(pipeline);
//   const facetData = result[0];
//   const total = facetData.metaCounts[0]?.total || 0;

//   return {
//     meta: {
//       page: pageNum,
//       limit: limitNum,
//       total: total,
//       totalPage: Math.ceil(total / limitNum),
//       counts: facetData.metaCounts[0] || {
//         total: 0,
//         active: 0,
//         inactive: 0,
//         lowStock: 0,
//         featured: 0,
//       },
//     },
//     data: facetData.data,
//   };
// };


const getAllProductsFromDB = async (query: Record<string, any>) => {
  const {
    searchTerm,
    category,
    productType,
    status,
    isFeatured,
    isSubscriptionAvailable,
    page = 1,
    limit = 8,
    sort = "-createdAt",
  } = query;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const safeLimit = limitNum > 0 ? limitNum : 10;

  const matchStage: any = { isDeleted: { $ne: true } };
  const cleanSearchTerm =
    typeof searchTerm === "string" ? searchTerm.trim() : "";

  const andConditions: any[] = [];

  if (cleanSearchTerm) {
    const escaped = cleanSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    andConditions.push({
      $or: [
        { name: { $regex: escaped, $options: "i" } },
        { shortDescription: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { tags: { $in: [new RegExp(escaped, "i")] } },
      ],
    });
  }

  if (query.brand || query.brandID) {
    const rawBrand = String(query.brand || query.brandID).trim();
    const brandConditions: any[] = [
      { brandID: rawBrand },
      { brand: rawBrand },
    ];

    if (mongoose.Types.ObjectId.isValid(rawBrand)) {
      const objId = new mongoose.Types.ObjectId(rawBrand);
      brandConditions.push({ brandID: objId });
      brandConditions.push({ brand: objId });
    }

    // Look up brand by slug or name (case-insensitive)
    const escapedBrand = rawBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchedBrand = await Brand.findOne({
      $or: [
        { slug: { $regex: `^${escapedBrand}$`, $options: "i" } },
        { name: { $regex: `^${escapedBrand}$`, $options: "i" } },
      ],
      isDeleted: false,
    }).select("_id");

    if (matchedBrand) {
      brandConditions.push({ brandID: matchedBrand._id.toString() });
      brandConditions.push({ brandID: matchedBrand._id });
      brandConditions.push({ brand: matchedBrand._id.toString() });
      brandConditions.push({ brand: matchedBrand._id });
    }

    andConditions.push({ $or: brandConditions });
  }

  if (andConditions.length > 0) {
    matchStage.$and = andConditions;
  }

  if (category) {
    const descendantIds = await CategoryServices.getAllCategoryAndDescendantIds(category);
    if (descendantIds.length > 0) {
      matchStage.categoryID = { $in: descendantIds };
    } else {
      matchStage.categoryID = mongoose.Types.ObjectId.isValid(category)
        ? new mongoose.Types.ObjectId(category)
        : category;
    }
  }
  if (productType) matchStage.productType = productType;
  if (status) matchStage.status = status;
  if (isFeatured !== undefined) matchStage.isFeatured = isFeatured === "true";
  if (query.isNewCollection !== undefined) {
    matchStage.isNewCollection = query.isNewCollection === "true" || query.isNewCollection === true;
  }
  if (isSubscriptionAvailable !== undefined) {
    matchStage.isSubscriptionAvailable = isSubscriptionAvailable === "true";
  }

  const pipeline: PipelineStage[] = [
    { $match: matchStage },

    // ১. ক্যাটাগরি পপুলেশন
    {
      $lookup: {
        from: "categories",
        localField: "categoryID",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, _id: 1 } }],
        as: "categoryDetails",
      },
    },
    { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },

    // ২. ব্র্যান্ড পপুলেশন (String ও ObjectId উভয় সাপোর্ট)
    {
      $lookup: {
        from: "brands",
        let: { bId: "$brandID" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ["$_id", "$$bId"] },
                  { $eq: [{ $toString: "$_id" }, { $toString: "$$bId" }] },
                ],
              },
            },
          },
          { $project: { name: 1, logo: 1, slug: 1, _id: 1 } },
        ],
        as: "brandDetails",
      },
    },
    { $unwind: { path: "$brandDetails", preserveNullAndEmptyArrays: true } },

    // ৩. বেস ইউনিট পপুলেশন
    {
      $lookup: {
        from: "units",
        localField: "unit",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, shortName: 1, _id: 0 } }],
        as: "unitDetails",
      },
    },
    { $unwind: { path: "$unitDetails", preserveNullAndEmptyArrays: true } },

    // ৪. ভ্যারিয়েন্ট-এর unitID গুলোর নাম বের করা
    {
      $lookup: {
        from: "units",
        localField: "variants.unitID",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, shortName: 1 } }],
        as: "variantUnitsLookup",
      },
    },
    {
      $addFields: {
        variants: {
          $map: {
            input: { $ifNull: ["$variants", []] },
            as: "v",
            in: {
              $mergeObjects: [
                "$$v",
                {
                  unitName: {
                    $let: {
                      vars: {
                        matched: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$variantUnitsLookup",
                                cond: { $eq: ["$$this._id", "$$v.unitID"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$matched.name",
                    },
                  },
                  unitShortName: {
                    $let: {
                      vars: {
                        matched: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$variantUnitsLookup",
                                cond: { $eq: ["$$this._id", "$$v.unitID"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$matched.shortName",
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },

    // ৫. combo items-এর productID থেকে product + তার unit + variants populate
    {
      $lookup: {
        from: "products",
        localField: "comboItems.productID",
        foreignField: "_id",
        pipeline: [
          {
            $lookup: {
              from: "units",
              localField: "unit",
              foreignField: "_id",
              pipeline: [{ $project: { name: 1, shortName: 1, _id: 0 } }],
              as: "unitDetails",
            },
          },
          { $unwind: { path: "$unitDetails", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "units",
              localField: "variants.unitID",
              foreignField: "_id",
              pipeline: [{ $project: { name: 1, shortName: 1 } }],
              as: "variantUnitsLookup",
            },
          },
          {
            $addFields: {
              variants: {
                $map: {
                  input: { $ifNull: ["$variants", []] },
                  as: "v",
                  in: {
                    $mergeObjects: [
                      "$$v",
                      {
                        unitName: {
                          $let: {
                            vars: {
                              matched: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$variantUnitsLookup",
                                      cond: { $eq: ["$$this._id", "$$v.unitID"] },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                            in: "$$matched.name",
                          },
                        },
                        unitShortName: {
                          $let: {
                            vars: {
                              matched: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$variantUnitsLookup",
                                      cond: { $eq: ["$$this._id", "$$v.unitID"] },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                            in: "$$matched.shortName",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              name: 1,
              slug: 1,
              thumbnail: 1,
              weightOrVolume: 1,
              unitDetails: 1,
              variants: 1,
            },
          },
        ],
        as: "comboProductDetails",
      },
    },

    // ৬. comboItems array-এর সাথে matched product/variant info merge করা
    {
      $addFields: {
        comboItems: {
          $map: {
            input: { $ifNull: ["$comboItems", []] },
            as: "item",
            in: {
              $let: {
                vars: {
                  matchedProduct: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$comboProductDetails",
                          cond: { $eq: ["$$this._id", "$$item.productID"] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  $let: {
                    vars: {
                      matchedVariant: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: { $ifNull: ["$$matchedProduct.variants", []] },
                              cond: { $eq: ["$$this._id", "$$item.selectedVariant"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      $mergeObjects: [
                        "$$item",
                        {
                          productName: "$$matchedProduct.name",
                          productSlug: "$$matchedProduct.slug",
                          productThumbnail: "$$matchedProduct.thumbnail",
                          weightOrVolume: {
                            $cond: [
                              { $ifNull: ["$$item.selectedVariant", false] },
                              "$$matchedVariant.weightOrVolume",
                              "$$matchedProduct.weightOrVolume",
                            ],
                          },
                          unitName: {
                            $cond: [
                              { $ifNull: ["$$item.selectedVariant", false] },
                              "$$matchedVariant.unitName",
                              "$$matchedProduct.unitDetails.name",
                            ],
                          },
                          unitShortName: {
                            $cond: [
                              { $ifNull: ["$$item.selectedVariant", false] },
                              "$$matchedVariant.unitShortName",
                              "$$matchedProduct.unitDetails.shortName",
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ৭. temporary lookup fields clean up
    {
      $project: {
        comboProductDetails: 0,
        variantUnitsLookup: 0,
      },
    },

    // ৮. Facet (Pagination & Meta)
    {
      $facet: {
        data: [
          { $sort: { [sort.replace("-", "")]: sort.startsWith("-") ? -1 : 1 } },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
        ] as any,
        metaCounts: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: {
                $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
              },
              inactive: {
                $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
              },
              lowStock: {
                $sum: { $cond: [{ $lte: ["$stock", "$lowStockAlert"] }, 1, 0] },
              },
              featured: { $sum: { $cond: ["$isFeatured", 1, 0] } },
            },
          },
        ] as any,
      },
    },
  ];

  const result = await Product.aggregate(pipeline);
  const facetData = result[0];
  const total = facetData.metaCounts[0]?.total || 0;

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total: total,
      totalPage: Math.ceil(total / limitNum),
      counts: facetData.metaCounts[0] || {
        total: 0,
        active: 0,
        inactive: 0,
        lowStock: 0,
        featured: 0,
      },
    },
    data: facetData.data,
  };
};



const deleteProductFromDB = async (id: string) => {
  const result = await Product.findByIdAndDelete(id);
  return result;
};


const getSingleProductFromDB = async (id: string) => {
  // ১. ভ্যালিডেশন: আইডিটি সঠিক ObjectId কি না
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Product ID format");
  }

  // ২. প্রোডাক্ট কুয়েরি
  const product = await Product.findById(id)
    .populate("categoryID") // ক্যাটাগরি ডিটেইলস
    .populate("unit", "name shortName") // মেইন প্রোডাক্ট ইউনিট
    .populate("variants.unitID", "name shortName") // ভেরিয়েন্ট ইউনিট
    .populate({
      path: "comboItems.productID",
      select: "name slug thumbnail regularPrice salePrice stock unit",
      populate: { path: "unit", select: "name shortName" }
    });

  if (!product) {
    throw new Error("Product not found!");
  }

  // ৩. ব্র্যান্ড হ্যান্ডলিং: যদি brandID "nonebrand" হয়, তবে ডাটাবেসে কুয়েরি না করে ফিল্ডটি null করে দিন
  let brandData = null;
  if (product.brandID && product.brandID !== "nonebrand" && mongoose.Types.ObjectId.isValid(product.brandID as string)) {
    // ব্র্যান্ডের তথ্য নিয়ে আসুন
    const brand = await mongoose.model('Brand').findById(product.brandID);
    brandData = brand;
  }

  // ৪. ফাইনাল অবজেক্ট তৈরি (brandID এর জায়গায় অবজেক্ট বসানো)
  const productObj = product.toObject();
  productObj.brandID = brandData;

  return productObj;
};

const getProductsByCategorySlugFromDB = async (
  slug: string,
  query: Record<string, any>,
) => {
  const category = await Category.findOne({ slug });
  if (!category) throw new Error("Category not found");

  const { searchTerm, page = 1, limit = 10, sort = "-createdAt" } = query;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  const descendantIds = await CategoryServices.getAllCategoryAndDescendantIds(category._id);
  const matchCat = descendantIds.length > 0 ? { $in: descendantIds } : category._id;

  const matchStage: any = { categoryID: matchCat, status: "active", isDeleted: { $ne: true } };

  if (searchTerm) {
    matchStage.$or = [
      { name: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
    ];
  }

  const pipeline: any[] = [
    { $match: matchStage },

    // ১. ক্যাটাগরি পপুলেশন
    {
      $lookup: {
        from: "categories",
        localField: "categoryID",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, _id: 1 } }],
        as: "categoryDetails",
      },
    },
    { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },

    // ২. ব্র্যান্ড পপুলেশন
    {
      $lookup: {
        from: "brands",
        localField: "brandID",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, _id: 1 } }],
        as: "brandDetails",
      },
    },
    { $unwind: { path: "$brandDetails", preserveNullAndEmptyArrays: true } },

    // ৩. বেস ইউনিট পপুলেশন
    {
      $lookup: {
        from: "units",
        localField: "unit",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, shortName: 1, _id: 0 } }],
        as: "unitDetails",
      },
    },
    { $unwind: { path: "$unitDetails", preserveNullAndEmptyArrays: true } },

    // ৪. ভ্যারিয়েন্ট-এর unitID গুলোর নাম বের করা
    {
      $lookup: {
        from: "units",
        localField: "variants.unitID",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, shortName: 1 } }],
        as: "variantUnitsLookup",
      },
    },
    {
      $addFields: {
        variants: {
          $map: {
            input: "$variants",
            as: "v",
            in: {
              $mergeObjects: [
                "$$v",
                {
                  unitName: {
                    $let: {
                      vars: {
                        matched: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$variantUnitsLookup",
                                cond: { $eq: ["$$this._id", "$$v.unitID"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$matched.name",
                    },
                  },
                  unitShortName: {
                    $let: {
                      vars: {
                        matched: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$variantUnitsLookup",
                                cond: { $eq: ["$$this._id", "$$v.unitID"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$matched.shortName",
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },

    // ৫. combo items-এর productID থেকে product + তার unit + variants populate
    {
      $lookup: {
        from: "products",
        localField: "comboItems.productID",
        foreignField: "_id",
        pipeline: [
          {
            $lookup: {
              from: "units",
              localField: "unit",
              foreignField: "_id",
              pipeline: [{ $project: { name: 1, shortName: 1, _id: 0 } }],
              as: "unitDetails",
            },
          },
          { $unwind: { path: "$unitDetails", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "units",
              localField: "variants.unitID",
              foreignField: "_id",
              pipeline: [{ $project: { name: 1, shortName: 1 } }],
              as: "variantUnitsLookup",
            },
          },
          {
            $addFields: {
              variants: {
                $map: {
                  input: "$variants",
                  as: "v",
                  in: {
                    $mergeObjects: [
                      "$$v",
                      {
                        unitName: {
                          $let: {
                            vars: {
                              matched: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$variantUnitsLookup",
                                      cond: { $eq: ["$$this._id", "$$v.unitID"] },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                            in: "$$matched.name",
                          },
                        },
                        unitShortName: {
                          $let: {
                            vars: {
                              matched: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$variantUnitsLookup",
                                      cond: { $eq: ["$$this._id", "$$v.unitID"] },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                            in: "$$matched.shortName",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              name: 1,
              slug: 1,
              thumbnail: 1,
              weightOrVolume: 1,
              unitDetails: 1,
              variants: 1,
            },
          },
        ],
        as: "comboProductDetails",
      },
    },

    // ৬. comboItems array-এর সাথে matched product/variant info merge করা
    {
      $addFields: {
        comboItems: {
          $map: {
            input: "$comboItems",
            as: "item",
            in: {
              $let: {
                vars: {
                  matchedProduct: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$comboProductDetails",
                          cond: { $eq: ["$$this._id", "$$item.productID"] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  $let: {
                    vars: {
                      matchedVariant: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: { $ifNull: ["$$matchedProduct.variants", []] },
                              cond: { $eq: ["$$this._id", "$$item.selectedVariant"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      $mergeObjects: [
                        "$$item",
                        {
                          productName: "$$matchedProduct.name",
                          productSlug: "$$matchedProduct.slug",
                          productThumbnail: "$$matchedProduct.thumbnail",
                          weightOrVolume: {
                            $cond: [
                              { $ifNull: ["$$item.selectedVariant", false] },
                              "$$matchedVariant.weightOrVolume",
                              "$$matchedProduct.weightOrVolume",
                            ],
                          },
                          unitName: {
                            $cond: [
                              { $ifNull: ["$$item.selectedVariant", false] },
                              "$$matchedVariant.unitName",
                              "$$matchedProduct.unitDetails.name",
                            ],
                          },
                          unitShortName: {
                            $cond: [
                              { $ifNull: ["$$item.selectedVariant", false] },
                              "$$matchedVariant.unitShortName",
                              "$$matchedProduct.unitDetails.shortName",
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ৭. temporary lookup fields clean up
    {
      $project: {
        comboProductDetails: 0,
        variantUnitsLookup: 0,
      },
    },

    // ৮. Facet (Pagination & Meta)
    {
      $facet: {
        data: [
          { $sort: { [sort.replace("-", "")]: sort.startsWith("-") ? -1 : 1 } },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
        ],
        metaCounts: [{ $count: "total" }],
      },
    },
  ];

  const result = await Product.aggregate(pipeline);
  const total = result[0]?.metaCounts[0]?.total || 0;

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total: total,
      totalPage: Math.ceil(total / limitNum),
    },
    data: result[0]?.data || [],
  };
};

const getRelatedProductsFromDB = async (
  categoryId: string,
  productId: string,
) => {
  const result = await Product.find({
    categoryID: categoryId, // Same category hote hobe
    _id: { $ne: productId }, // $ne mane 'Not Equal' - mane current product bad diye
  })
    .limit(5) // Figma design e 4ti product ache
    .populate("categoryID");

  return result;
};

const getLowStockProductsFromDB = async () => {
  const result = await Product.find({
    $expr: { $lte: ["$stock", "$lowStockAlert"] },
  })
    .populate("categoryID")
    .sort({ stock: 1 });

  return result;
};


// ===== Get Featured Products =====
// const getFeaturedProducts = async (limit: number = 6) => {
//   // 1️⃣ Products 
//   const products = await Product.find({
//     isFeatured: true,
//     status: "active",
//   })
//     .limit(limit)
//     .populate("categoryID", "name slug")
//     .populate("unit", "name shortName")
//     .lean()
//     .sort({ createdAt: -1 });

//   // 2️⃣ Valid brand IDs 
//   const validBrandIds: mongoose.Types.ObjectId[] = [];
  
//   products.forEach((p: any) => {
//     if (p.brandID && mongoose.Types.ObjectId.isValid(p.brandID.toString())) {
//       try {
//         validBrandIds.push(new mongoose.Types.ObjectId(p.brandID.toString()));
//       } catch (error) {
//         // Invalid ObjectId, skip
//       }
//     }
//   });

//   // 3️⃣ Brands fetch
//   let brandMap = new Map();
//   if (validBrandIds.length > 0) {
//     const brands = await Brand.find({ 
//       _id: { $in: validBrandIds } 
//     }).select("name logo").lean();
    
//     brandMap = new Map(brands.map((b: any) => [b._id.toString(), b]));
//   }

//   // 4️⃣ Products এ brand assign 
//   const result = products.map((product: any) => ({
//     ...product,
//     brandID: product.brandID && brandMap.has(product.brandID.toString())
//       ? brandMap.get(product.brandID.toString())
//       : null,
//   }));

//   return result;
// };

const getFeaturedProducts = async (limit: number = 10) => {
  // 1️⃣ Products 
  const products = await Product.find({
    isFeatured: true,
    status: "active",
  })
    .limit(limit)
    .populate("categoryID", "name slug")
    .populate("unit", "name shortName")
    .populate("variants.unitID", "name shortName")
    .populate({
      path: "comboItems.productID",
      select: "name slug thumbnail unit weightOrVolume variants",
      populate: [
        { path: "unit", select: "name shortName" },
        { path: "variants.unitID", select: "name shortName" },
      ],
    })
    .lean()
    .sort({ createdAt: -1 });

  // 2️⃣ Valid brand IDs 
  const validBrandIds: mongoose.Types.ObjectId[] = [];

  products.forEach((p: any) => {
    if (p.brandID && mongoose.Types.ObjectId.isValid(p.brandID.toString())) {
      try {
        validBrandIds.push(new mongoose.Types.ObjectId(p.brandID.toString()));
      } catch (error) {
        // Invalid ObjectId, skip
      }
    }
  });

  // 3️⃣ Brands fetch
  let brandMap = new Map();
  if (validBrandIds.length > 0) {
    const brands = await Brand.find({
      _id: { $in: validBrandIds },
    }).select("name logo").lean();

    brandMap = new Map(brands.map((b: any) => [b._id.toString(), b]));
  }

  // 4️⃣ Products এ brand assign + variants/comboItems enrich
  const result = products.map((product: any) => {
    // --- variants-e unitName/unitShortName add kora (unitID object take theke) ---
    const enrichedVariants = (product.variants || []).map((variant: any) => ({
      ...variant,
      unitName: variant.unitID?.name,
      unitShortName: variant.unitID?.shortName,
    }));

    // --- comboItems enrich kora ---
    const enrichedComboItems = (product.comboItems || []).map((item: any) => {
      const comboProduct = item.productID; // populated object

      let weightOrVolume = null;
      let unitName = null;
      let unitShortName = null;

      if (item.selectedVariant && comboProduct?.variants?.length) {
        const matchedVariant = comboProduct.variants.find(
          (v: any) => v._id.toString() === item.selectedVariant.toString(),
        );

        if (matchedVariant) {
          weightOrVolume = matchedVariant.weightOrVolume;
          unitName = matchedVariant.unitID?.name;
          unitShortName = matchedVariant.unitID?.shortName;
        }
      } else {
        weightOrVolume = comboProduct?.weightOrVolume ?? null;
        unitName = comboProduct?.unit?.name;
        unitShortName = comboProduct?.unit?.shortName;
      }

      return {
        ...item,
        productID: comboProduct?._id ?? item.productID, // original id-tei rakhlam
        productName: comboProduct?.name,
        productSlug: comboProduct?.slug,
        productThumbnail: comboProduct?.thumbnail,
        weightOrVolume,
        unitName,
        unitShortName,
      };
    });

    return {
      ...product,
      brandID:
        product.brandID && brandMap.has(product.brandID.toString())
          ? brandMap.get(product.brandID.toString())
          : null,
      variants: enrichedVariants,
      comboItems: enrichedComboItems,
    };
  });

  return result;
};

const getNewCollectionProducts = async (limit: number = 12) => {
  let products = await Product.find({
    isNewCollection: true,
    status: "active",
  })
    .limit(limit)
    .populate("categoryID", "name slug")
    .populate("unit", "name shortName")
    .populate("variants.unitID", "name shortName")
    .populate({
      path: "comboItems.productID",
      select: "name slug thumbnail unit weightOrVolume variants",
      populate: [
        { path: "unit", select: "name shortName" },
        { path: "variants.unitID", select: "name shortName" },
      ],
    })
    .lean()
    .sort({ createdAt: -1 });

  // If no products explicitly tagged yet, fallback to active products so homepage has content
  if (!products || products.length === 0) {
    products = await Product.find({
      status: "active",
    })
      .limit(limit)
      .populate("categoryID", "name slug")
      .populate("unit", "name shortName")
      .populate("variants.unitID", "name shortName")
      .lean()
      .sort({ createdAt: -1 });
  }

  return products;
};

export const ProductServices = {
  createProductIntoDB,
  getAllProductsFromDB,
  getSingleProductFromDB,
  deleteProductFromDB,
  getRelatedProductsFromDB,
  updateProductIntoDB,
  getLowStockProductsFromDB,
  getProductsByCategorySlugFromDB,
  getFeaturedProducts,
  getNewCollectionProducts,
};
