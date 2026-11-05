import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ComplaintServices } from './complaint.service';


const createComplaint = async (req: Request, res: Response) => {
  const userID = (req as any).user._id; 
  
  const files = req.files as Express.Multer.File[];
  const result = await ComplaintServices.createComplaintIntoDB(userID, req.body, files);

  res.status(201).json({
    success: true,
    message: "Complaint created successfully",
    data: result
  });
};

const updateComplaint = catchAsync(async (req: Request, res: Response) => {
  // কনস্ট্রাক্টিং ডাটা
  const payload = {
    ...req.body,
    // যদি বডিতে স্ট্যাটাস না থাকে, তবে ডিফল্ট 'resolved' বসবে
    status: req.body.status || 'resolved' 
  };

  const result = await ComplaintServices.updateComplaintAdmin(
    req.params.id as string, 
    payload
  );
  
  sendResponse(res, { 
    statusCode: 200, 
    success: true, 
    message: 'Complaint updated successfully', 
    data: result 
  });
});

const getAllComplaints = catchAsync(async (req: Request, res: Response) => {
  // যদি status না থাকে, তবে ডিফল্টভাবে 'all' সেট হবে
  const status = (req.query.status as string) || 'all'; 
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  
  const result = await ComplaintServices.getAllComplaintsFromDB(
    page, 
    limit, 
    status
  );
  
  sendResponse(res, { 
    statusCode: 200, 
    success: true, 
    message: 'Complaints retrieved successfully', 
    data: result 
  });
});


const getSingleComplaint = catchAsync(async (req: Request, res: Response) => {
  const result = await ComplaintServices.getSingleComplaintFromDB(req.params.id as string );
  sendResponse(res, { statusCode: 200, success: true, message: 'Complaint details retrieved', data: result });
});

const getMyComplaints = catchAsync(async (req: Request, res: Response) => {
  const userID = (req as any).user._id; // মিডলওয়্যার থেকে আইডি
  const result = await ComplaintServices.getMyComplaintsFromDB(userID);
  
  sendResponse(res, { 
    statusCode: 200, 
    success: true, 
    message: 'User complaints retrieved successfully', 
    data: result 
  });
});

const deleteComplaint = catchAsync(async (req: Request, res: Response) => {
  await ComplaintServices.deleteComplaintFromDB(req.params.id as string);
  sendResponse(res, { statusCode: 200, success: true, message: 'Complaint deleted successfully', data: null });
});

export const ComplaintControllers = {
  createComplaint,
  updateComplaint,
  getAllComplaints,
  getSingleComplaint,
  deleteComplaint,
  getMyComplaints
};