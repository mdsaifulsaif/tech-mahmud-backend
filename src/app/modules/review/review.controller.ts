import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReviewServices } from './review.service';

const getReviewDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewServices.getReviewStatsFromDB();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Dashboard stats retrieved successfully',
    data: result,
  });
});

const createReview = catchAsync(async (req: Request, res: Response) => {

  const userId = (req as any).user?._id; 

  if (!userId) {
    throw new Error('User not authenticated!');
  }


  const reviewData = {
    ...req.body,
    userID: userId,
  };

 
  const result = await ReviewServices.addReviewToDB(reviewData);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Review added successfully!',
    data: result,
  });
});

const getReviews = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const status = req.query.status as string;

  const result = await ReviewServices.getAllReviewsFromDB(page, limit, status);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Reviews retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getProductReviews = catchAsync(async (req: Request, res: Response) => {

 const productId: string = req.params.id as string;


  const page = Number(req.query.page as string) || 1;
  const limit = Number(req.query.limit as string) || 10;

  
  const result = await ReviewServices.getReviewsByProductIdFromDB(
    productId, 
    page, 
    limit
  );

 
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Product reviews retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const changeReviewStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const result = await ReviewServices.updateReviewStatusDB(id as string, status);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Review status updated successfully',
    data: result,
  });
});

const addAdminReply = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reply } = req.body;
  
  const result = await ReviewServices.addAdminReplyToDB(id as string, reply);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Reply added successfully!',
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const result = await ReviewServices.deleteReviewFromDB(id as string);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Review deleted successfully!',
    data: result,
  });
});

// ✅ Get Featured Reviews (Public)
const getFeaturedReviews = catchAsync(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 6;
  const result = await ReviewServices.getFeaturedReviewsFromDB(limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Featured reviews retrieved successfully",
    data: result,
  });
});

// ✅ Toggle Featured Status (Admin)
const toggleFeatured = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReviewServices.toggleFeaturedReviewDB(id as string);

  // ✅ Check if result is null
  if (!result) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: "Review not found!",
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Review ${result.isFeatured ? "featured" : "unfeatured"} successfully`,
    data: result,
  });
});


export const ReviewControllers = {
  createReview,
  getReviews,
  getProductReviews,
  changeReviewStatus,
  getReviewDashboard,
  addAdminReply,
  deleteReview,
  getFeaturedReviews,
  toggleFeatured
};