import { Area } from "./area.model";

const KNOWN_BARISAL_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "bangla bazar": { lat: 22.6950, lng: 90.3690 },
  "banglabazar": { lat: 22.6950, lng: 90.3690 },
  "rupatoli": { lat: 22.6780, lng: 90.3450 },
  "barisal sadar": { lat: 22.7055, lng: 90.3555 },
  "sadar": { lat: 22.7055, lng: 90.3555 },
  "kashipur": { lat: 22.7185, lng: 90.3680 },
  "natullabad": { lat: 22.6885, lng: 90.3625 },
  "amtala": { lat: 22.6755, lng: 90.3745 },
  "choumatha": { lat: 22.7020, lng: 90.3580 },
  "c&b road": { lat: 22.7100, lng: 90.3600 },
  "sagordi": { lat: 22.6850, lng: 90.3700 },
  "chandmari": { lat: 22.6910, lng: 90.3780 },
  "notun bazar": { lat: 22.7080, lng: 90.3700 },
  "launch ghat": { lat: 22.7060, lng: 90.3750 },
  "band road": { lat: 22.7020, lng: 90.3720 },
  "goriar par": { lat: 22.7300, lng: 90.3400 },
};

const createArea = async (payload: any) => {
  const name = typeof payload === "string" ? payload.trim() : payload?.name?.trim();
  if (!name) throw new Error("Area name is required.");

  const existing = await Area.findOne({ name });
  if (existing) throw new Error("This area already exists.");

  let latitude = typeof payload === "object" ? payload.latitude : undefined;
  let longitude = typeof payload === "object" ? payload.longitude : undefined;
  const radius = typeof payload === "object" && payload.radius ? payload.radius : 1500;

  // Auto assign coordinates if matched known Barisal area and not explicitly given
  if ((latitude === undefined || latitude === null) && KNOWN_BARISAL_COORDINATES[name.toLowerCase()]) {
    latitude = KNOWN_BARISAL_COORDINATES[name.toLowerCase()].lat;
    longitude = KNOWN_BARISAL_COORDINATES[name.toLowerCase()].lng;
  }

  return await Area.create({
    name,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    radius,
    isActive: typeof payload === "object" && payload.isActive !== undefined ? payload.isActive : true,
  });
};

const getAllAreas = async (query: Record<string, any>) => {
  const { searchTerm, onlyActive, page = 1, limit = 100 } = query;

  const filter: any = {};
  if (onlyActive === "true") filter.isActive = true;
  if (searchTerm) filter.name = { $regex: searchTerm, $options: "i" };

  const skip = (Number(page) - 1) * Number(limit);

  const result = await Area.aggregate([
    { $match: filter },
    { $sort: { name: 1 } },
    { $skip: skip },
    { $limit: Number(limit) }
  ]);

  const total = await Area.countDocuments(filter);

  return {
    meta: { 
      page: Number(page), 
      limit: Number(limit), 
      total, 
      totalPage: Math.ceil(total / Number(limit)) 
    },
    data: result
  };
};

const updateArea = async (id: string, body: any) => {
  const area = await Area.findById(id);
  if (!area) throw new Error("Area not found!");

  if (body.name) area.name = body.name.trim();
  if (body.isActive !== undefined) area.isActive = body.isActive;
  if (body.latitude !== undefined) area.latitude = body.latitude;
  if (body.longitude !== undefined) area.longitude = body.longitude;
  if (body.radius !== undefined) area.radius = body.radius;

  // Auto assign coordinates if area name changed and no coords yet
  if ((!area.latitude || !area.longitude) && KNOWN_BARISAL_COORDINATES[area.name.toLowerCase()]) {
    area.latitude = KNOWN_BARISAL_COORDINATES[area.name.toLowerCase()].lat;
    area.longitude = KNOWN_BARISAL_COORDINATES[area.name.toLowerCase()].lng;
  }

  await area.save();
  return area;
};

const deleteArea = async (id: string) => {
  const area = await Area.findById(id);
  if (!area) throw new Error("Area not found!");

  await Area.findByIdAndDelete(id);
  return area;
};

const getSingleArea = async (id: string) => {
  const area = await Area.findById(id);
  if (!area) throw new Error("Area not found!");
  return area;
};

export const AreaServices = {
  createArea,
  getAllAreas,
  updateArea,
  deleteArea,
  getSingleArea,
};
