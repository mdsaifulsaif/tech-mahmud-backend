export interface IArea {
  name: string;
  isActive: boolean;
  latitude?: number | null;
  longitude?: number | null;
  radius?: number;
  createdAt?: Date;
  updatedAt?: Date;
}