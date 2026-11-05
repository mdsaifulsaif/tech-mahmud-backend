import { Schema, model } from "mongoose";
import { IArea } from "./area.interface";

const areaSchema = new Schema<IArea>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    radius: { type: Number, default: 1500 },
  },
  { timestamps: true },
);

export const Area = model<IArea>("Area", areaSchema);