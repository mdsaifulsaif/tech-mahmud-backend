export interface IBanner {
  title?: string;
  image: string;
  mobileImage?: string;
  link?: string;
  placement?: "slider" | "side_top" | "side_middle" | "side_bottom" | "popup";
  order?: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
