import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { Complaint } from "./complaint.model";

const createComplaintIntoDB = async (userID: string, payload: any, files: Express.Multer.File[]) => {
  const imageUrls = await Promise.all(
    files.map(async (file) => {
      const uploadResult: any = await uploadToCloudinary(file.buffer, "complaints");
      return uploadResult.secure_url || uploadResult.url;
    })
  );

  const finalData = {
    userID, // এটি এখন কন্ট্রোলার থেকে আসবে
    phoneNumber: payload.phoneNumber,
    text: payload.text,
    images: imageUrls, 
    status: 'pending'
  };

  const result = await Complaint.create(finalData);
  return result;
};

const updateComplaintAdmin = async (id: string, payload: { status?: string, adminResponse: string }) => {
  const isExist = await Complaint.findById(id);
  if (!isExist) throw new Error("Complaint not found!");

  const updateData = {
    ...payload,
    status: payload.status || 'resolved' 
  };

  return await Complaint.findByIdAndUpdate(id, updateData, { new: true });
};

const getAllComplaintsFromDB = async (page: number = 1, limit: number = 10, status?: string) => {
  const skip = (page - 1) * limit;
  const filter: any = {};
  
  // Apply status filter if provided
  if (status && status !== 'all') {
    filter.status = status;
  }

  // Fetch paginated data
  const data = await Complaint.find(filter)
    .populate('userID', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Get total count for pagination
  const total = await Complaint.countDocuments(filter);

  // Get status-wise counts (Dashboard Stats)
  const stats = await Complaint.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  // Transform stats into a readable object
  const statusCounts = stats.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, { pending: 0, 'in-progress': 0, resolved: 0, rejected: 0 });

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
      statusCounts // এখানে সব স্ট্যাটাসের আলাদা আলাদা কাউন্ট থাকবে
    },
    data
  };
};

const getSingleComplaintFromDB = async (id: string) => {
  const result = await Complaint.findById(id).populate('userID', 'firstName lastName email');
  if (!result) throw new Error("Complaint not found!");
  return result;
};

const getMyComplaintsFromDB = async (userID: string) => {
  // শুধুমাত্র ঐ নির্দিষ্ট ইউজারের কমপ্লেইনগুলো খুঁজবে
  const result = await Complaint.find({ userID }).sort({ createdAt: -1 });
  return result;
};

const deleteComplaintFromDB = async (id: string) => {
  return await Complaint.findByIdAndDelete(id);
};

export const ComplaintServices = {
  createComplaintIntoDB,
  updateComplaintAdmin,
  getAllComplaintsFromDB,
  getSingleComplaintFromDB,
  deleteComplaintFromDB,
  getMyComplaintsFromDB 
};