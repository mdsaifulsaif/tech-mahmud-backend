export interface IBanner {
  title?: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
  link?: string;
  categoryID?: any;
  categorySlug?: string;
  placement?:
    | "slider"
    | "side_top"
    | "side_middle"
    | "side_bottom"
    | "festive_1"
    | "festive_2"
    | "festive_3"
    | "promotional"
    | "promotional_2"
    | "promo_2_slot"
    | "promo_left"
    | "promo_right_top"
    | "promo_right_bottom"
    | "bottom_promo"
    | "popup"
    | string;
  slot?:
    | "left"
    | "right_top"
    | "right_bottom"
    | "slot_1"
    | "slot_2"
    | "bottom_row1_full"
    | "bottom_row2_col1"
    | "bottom_row2_col2"
    | "bottom_row2_col3"
    | string;
  order?: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
