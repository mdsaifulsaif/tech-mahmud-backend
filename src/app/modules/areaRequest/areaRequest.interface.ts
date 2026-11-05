export type AreaRequestStatus = "pending" | "reviewed" | "approved" | "rejected";

export interface IAreaRequest {
  name: string;
  phone: string;
  email?: string;
  areaName: string;
  city?: string;
  district?: string;
  notes?: string;
  status: AreaRequestStatus;
  adminNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
