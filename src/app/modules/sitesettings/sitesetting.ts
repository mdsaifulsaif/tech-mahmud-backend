import mongoose from 'mongoose';

const StoreSettingSchema = new mongoose.Schema({
  // General Settings
  siteName: { type: String, default: "My Store" },
  tagline: { type: String, default: "" },
  siteUrl: { type: String, default: "" },
  logo: { type: String, default: "" },
  favicon: { type: String, default: "" },
  
  // Contact Info
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  whatsapp: { type: String, default: "" },
  address: { type: String, default: "" },
  
  // Currency
  currency: {
    code: { type: String, default: "BDT" },
    symbol: { type: String, default: "৳" },
    position: { type: String, enum: ['before', 'after'], default: 'before' }
  },

  // Social Links
  socialLinks: {
    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" }
  },

  // Maintenance
  isMaintenanceMode: { type: Boolean, default: false }
}, { timestamps: true });

export const StoreSetting = mongoose.models.StoreSetting || mongoose.model("StoreSetting", StoreSettingSchema);