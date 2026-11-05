import mongoose, { Schema, model } from "mongoose";
import { IProduct } from "./product.interface";

const variantAttributesSchema = new Schema(
  {
    color: {
      name: { type: String, trim: true },
      hexCode: { type: String, trim: true },
      image: { type: String, trim: true },
    },
    size: { type: String, trim: true },
    storage: { type: String, trim: true },
    ram: { type: String, trim: true },
    version: { type: String, trim: true },
  },
  { _id: false }
);

const productVariantSchema = new Schema(
  {
    variantName: { type: String, trim: true },
    sku: { type: String, trim: true },
    attributes: { type: variantAttributesSchema, default: {} },
    costPrice: { type: Number, min: 0, default: 0 },
    regularPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    image: { type: String, trim: true },
    weightOrVolume: { type: Number, min: 0 },
    unitID: {
      type: Schema.Types.Mixed,
      ref: "Unit",
      default: null,
    },
  },
  { timestamps: true }
);

const specificationSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const warrantySchema = new Schema(
  {
    hasWarranty: { type: Boolean, default: false },
    duration: { type: String, trim: true, default: "" },
    warrantyType: {
      type: String,
      enum: ["Official Brand Warranty", "Seller Warranty", "Replacement Only", "No Warranty"],
      default: "No Warranty",
    },
    details: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true },
    productType: {
      type: String,
      enum: ["clothing", "gadget", "general", "single", "combo"],
      default: "general",
    },
    hasVariants: { type: Boolean, default: false },

    shortDescription: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    categoryID: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategoryID: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    brandID: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Brand",
      default: null,
    },
    tags: [{ type: String, trim: true }],

    // Single product pricing & inventory
    costPrice: { type: Number, min: 0, default: 0 },
    regularPrice: { type: Number, min: 0, default: 0 },
    salePrice: { type: Number, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    sku: { type: String, unique: true, sparse: true, trim: true },
    lowStockAlert: { type: Number, default: 10, min: 0 },

    thumbnail: { type: String, required: true, trim: true },
    images: [{ type: String, trim: true }],

    // Variants & Specifications
    variants: {
      type: [productVariantSchema],
      default: [],
    },
    specifications: {
      type: [specificationSchema],
      default: [],
    },
    warranty: {
      type: warrantySchema,
      default: { hasWarranty: false },
    },
    sizeGuide: { type: String, trim: true },

    // Optional legacy unit / weight
    unit: {
      type: Schema.Types.Mixed,
      ref: "Unit",
      default: null,
    },
    weightOrVolume: { type: Number, min: 0 },
    weight: { type: Number, min: 0 },

    comboItems: {
      type: [
        {
          productID: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          quantity: { type: Number, default: 1, min: 1 },
          selectedVariant: {
            type: Schema.Types.ObjectId,
            default: null,
          },
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
    },
    isFeatured: { type: Boolean, default: false },
    isOnSale: { type: Boolean, default: false },
    isNew: { type: Boolean, default: true },
    isNewCollection: { type: Boolean, default: false },

    // Shipping
    freeShipping: { type: Boolean, default: false },
    shippingCost: { type: Number, default: 0, min: 0 },
    shippingClass: {
      type: String,
      enum: ["normal", "fragile", "heavy"],
      default: "normal",
    },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },

    // Marketing & SEO Fields (Protected)
    metaTitle: { type: String, trim: true, default: "" },
    metaDescription: { type: String, trim: true, default: "" },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
    straight_up: { type: String, trim: true },
    lowdown: [{ type: String, trim: true }],
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

productSchema.virtual("availableStock").get(function () {
  return this.stock - (this.reservedStock || 0);
});

productSchema.pre("save", async function () {
  // slug auto generate
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  // discount percent auto calculate
  if (this.regularPrice && this.salePrice) {
    this.discountPercent = Math.round(
      ((this.regularPrice - this.salePrice) / this.regularPrice) * 100
    );
  } else {
    this.discountPercent = 0;
  }

  // if product has variants, sync total stock & base pricing from variants
  if (this.variants && this.variants.length > 0) {
    this.hasVariants = true;
    this.stock = this.variants.reduce(
      (total, variant) => total + (variant.stock || 0),
      0
    );
    if (this.variants[0].regularPrice) {
      this.regularPrice = this.variants[0].regularPrice;
    }
    if (this.variants[0].salePrice) {
      this.salePrice = this.variants[0].salePrice;
    }
  }
});

// Indexes for fast searching and filtering
productSchema.index({ name: "text", shortDescription: "text", tags: "text" });
productSchema.index({ categoryID: 1, status: 1 });
productSchema.index({ brandID: 1, status: 1 });
productSchema.index({ productType: 1, status: 1 });
productSchema.index({ "variants.attributes.size": 1 });
productSchema.index({ "variants.attributes.color.name": 1 });

export const Product = model<IProduct>("Product", productSchema);
