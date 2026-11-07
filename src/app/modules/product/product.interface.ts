import { Types } from "mongoose";

export interface GetProductsParams {
  isNew?: string;
  limit?: number;
}

export interface IVariantAttributes {
  color?: {
    name: string;
    hexCode?: string;
    image?: string;
  };
  size?: string;
  storage?: string;
  ram?: string;
  version?: string;
}

export interface IProductVariant {
  _id?: Types.ObjectId | string;
  variantName?: string;
  sku?: string;
  attributes?: IVariantAttributes;
  costPrice?: number;
  regularPrice: number;
  salePrice?: number;
  stock: number;
  image?: string;
  weightOrVolume?: number;
  unitID?: Types.ObjectId | string;
}

export interface IComboItem {
  productID: Types.ObjectId | string;
  quantity: number;
  selectedVariant?: string;
}

export interface ISpecification {
  key: string;
  value: string;
}

export interface IWarranty {
  hasWarranty: boolean;
  duration?: string;
  warrantyType?: "Official Brand Warranty" | "Seller Warranty" | "Replacement Only" | "No Warranty";
  details?: string;
}

export interface IBrand {
  _id: string;
  name: string;
  slug?: string;
  logo?: string;
}

export interface IProduct {
  name: string;
  slug?: string;
  productType: "clothing" | "gadget" | "general" | "single" | "combo";
  hasVariants: boolean;

  shortDescription: string;
  description: string;

  costPrice?: number;
  regularPrice: number;
  salePrice?: number;
  discountPercent?: number;
  stock: number;
  reservedStock?: number;
  availableStock?: number;
  sku?: string;
  lowStockAlert?: number;

  thumbnail: string;
  images: string[];

  categoryID: Types.ObjectId | string;
  subCategoryID?: Types.ObjectId | string;
  brandID?: Types.ObjectId | string | IBrand | null;
  tags: string[];

  // Clothing & Gadget Specific
  variants?: IProductVariant[];
  specifications?: ISpecification[];
  warranty?: IWarranty;
  sizeGuide?: string;

  // Single product unit / weight
  unit?: string | Types.ObjectId;
  weightOrVolume?: number;
  weight?: number;

  comboItems?: IComboItem[];

  // Merchandising & Marketing Flags
  status: "active" | "inactive" | "draft";
  isFeatured: boolean;
  isOnSale: boolean;
  isNew: boolean;
  isNewCollection?: boolean;
  isTrending?: boolean;

  // Shipping
  shippingClass?: "normal" | "fragile" | "heavy";
  freeShipping: boolean;
  shippingCost?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };

  // SEO & Marketing Fields (Protected)
  metaTitle?: string;
  metaDescription?: string;

  rating?: number;
  numReviews?: number;
  straight_up?: string;
  lowdown?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
