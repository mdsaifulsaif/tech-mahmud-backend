import { Schema, model } from 'mongoose';

const complaintSchema = new Schema({
  userID: { type: Schema.Types.ObjectId, ref: 'User', required: true }, 
  phoneNumber: { type: String, required: true },
  text: { type: String, required: true },
  images: [{ type: String }],
  status: { type: String, enum: ['pending', 'in-progress', 'resolved', 'rejected'], default: 'pending' },
  adminResponse: { type: String },
}, { timestamps: true });

export const Complaint = model('Complaint', complaintSchema);