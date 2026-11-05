import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ProductServices } from "./product.service";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { Product } from "./product.model";
import { deleteFromCloudinary } from "../../utils/deleteFromCloudinary";
import { Category } from "../category/category.model";
import { revalidateFrontend } from "../../utils/revalidateFrontend";

const createProduct = catchAsync(async (req: Request, res: Response) => {
  // বডি এবং ফাইল সরাসরি সার্ভিসে পাঠানো হচ্ছে
  const result = await ProductServices.createProductIntoDB(req.body, req.files);

  // Trigger on-demand revalidation on frontend
  revalidateFrontend({ tag: "products" });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Product created successfully!",
    data: result,
  });
});

const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await ProductServices.updateProductIntoDB(
      id as string,
      req.body,
      req.files,
    ); // ProductServices থেকে call করুন

    // Trigger on-demand revalidation on frontend
    revalidateFrontend({ tag: "products" });

    res.status(200).json({
      success: true,
      message: "Product updated successfully!",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductServices.getAllProductsFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Products retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProductServices.getSingleProductFromDB(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product retrieved successfully!",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    throw new Error("Product not found!");
  }

  if (product.thumbnail) {
    const thumbPublicId = product.thumbnail.split("/").pop()?.split(".")[0];
    if (thumbPublicId) {
      await deleteFromCloudinary(`glowly_products/thumbnails/${thumbPublicId}`);
    }
  }

  if (product.images && product.images.length > 0) {
    const deletePromises = product.images.map((imgUrl) => {
      const imgPublicId = imgUrl.split("/").pop()?.split(".")[0];
      return imgPublicId
        ? deleteFromCloudinary(`glowly_products/gallery/${imgPublicId}`)
        : Promise.resolve();
    });
    await Promise.all(deletePromises);
  }

  await ProductServices.deleteProductFromDB(id as string);

  // Trigger on-demand revalidation on frontend
  revalidateFrontend({ tag: "products" });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product and associated images deleted successfully!",
    data: null,
  });
});

const getProductsByCategorySlug = catchAsync(
  async (req: Request, res: Response) => {
    const { slug } = req.params;
    const catSlug = slug as string;
    const result = await ProductServices.getProductsByCategorySlugFromDB(
      catSlug,
      req.query,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Products retrieved successfully by category slug",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getRelatedProducts = catchAsync(async (req: Request, res: Response) => {
  const { categoryId, productId } = req.query; // Query theke nilam

  const result = await ProductServices.getRelatedProductsFromDB(
    categoryId as string,
    productId as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Related products retrieved successfully!",
    data: result,
  });
});

const getLowStockProducts = async (req: Request, res: Response) => {
  try {
    const result = await ProductServices.getLowStockProductsFromDB();

    res.status(200).json({
      success: true,
      message: "Low stock products fetched based on their alerts",
      count: result.length,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
      error: error,
    });
  }
};


// ===== ✅ Get Featured Products =====
const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const { limit = 6 } = req.query;
    const products = await ProductServices. getFeaturedProducts (Number(limit));

    res.status(200).json({
      success: true,
      message: "Featured products retrieved successfully",
      data: products,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to get featured products",
    });
  }
};

// ===== ✅ Get New Collection Products =====
const getNewCollectionProducts = async (req: Request, res: Response) => {
  try {
    const { limit = 12 } = req.query;
    const products = await ProductServices.getNewCollectionProducts(Number(limit));

    res.status(200).json({
      success: true,
      message: "New collection products retrieved successfully",
      data: products,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to get new collection products",
    });
  }
};

export const ProductControllers = {
  createProduct,
  getAllProducts,
  deleteProduct,
  getSingleProduct,
  getRelatedProducts,
  updateProduct,
  getLowStockProducts,
  getProductsByCategorySlug,
  getFeaturedProducts,
  getNewCollectionProducts,
};
