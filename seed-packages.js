const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb+srv://sobjihaat:DWzOWK8mKApKZazg@cluster0.ym9ehhj.mongodb.net/?appName=Cluster0';

const packageItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    quantity: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const subscriptionPackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    boxType: { type: String, enum: ['cleaning', 'vegetable', 'custom'], required: true },
    frequency: { type: String, enum: ['weekly', 'monthly', 'both'], required: true },
    frequencyText: { type: String, default: '' },
    badge: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    description: { type: String, default: '' },
    thumbnail: { type: String, required: true },
    images: { type: [String], default: [] },
    regularPrice: { type: Number, required: true },
    subscriptionPrice: { type: Number, required: true },
    salePrice: { type: Number },
    discountPercent: { type: Number, default: 0 },
    freeShipping: { type: Boolean, default: true },
    items: { type: [packageItemSchema], default: [] },
    idealFor: { type: String, default: '' },
    isPinnedToHome: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    allowOneTimePurchase: { type: Boolean, default: true },
    sku: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

const SubscriptionPackage = mongoose.models.SubscriptionPackage || mongoose.model('SubscriptionPackage', subscriptionPackageSchema);

const samplePackages = [
  {
    name: 'ফ্যামিলি বেসিক ক্লিনিং বক্স',
    slug: 'family-basic-cleaning-box',
    boxType: 'cleaning',
    frequency: 'monthly',
    frequencyText: 'প্রতি মাসে ১ বার',
    badge: 'জনপ্রিয় ফ্যামিলি চয়েস',
    shortDescription: '৩–৪ জনের সাধারণ পরিবারের মাসিক ক্লিনিং ও হাইজিন সামগ্রীর সাশ্রয়ী কম্বো বক্স।',
    description: 'প্রতি মাসে আপনার ঘরের প্রয়োজনীয় সব ক্লিনিং উপাদান পৌঁছে যাবে কোনো ডেলিভারি চার্জ ছাড়াই।',
    thumbnail: '/images/monthly_cleaning_box.jpg',
    images: ['/images/monthly_cleaning_box.jpg'],
    regularPrice: 950,
    subscriptionPrice: 875,
    discountPercent: 8,
    freeShipping: true,
    isPinnedToHome: true,
    sortOrder: 1,
    status: 'active',
    allowOneTimePurchase: true,
    sku: 'CLN-FAM-BSC',
    tags: ['cleaning', 'household', 'monthly'],
    idealFor: '৩–৪ জনের সাধারণ পরিবারের মাসিক প্রয়োজন',
    items: [
      { itemName: 'হুইল / সার্ফ এক্সেল ডিটারজেন্ট', quantity: '১ কেজি' },
      { itemName: 'হারপিক টয়লেট ক্লিনার', quantity: '৭৫০ মিলি' },
      { itemName: 'ভিম বার / লিকুইড ডিশওয়াশার', quantity: '৫০০ গ্রাম/মিলি' },
      { itemName: 'লাইফবয় / ডেটোল গায়ের সাবান', quantity: '২ পিস' },
      { itemName: 'ক্লোজআপ / কোলগেট টুথপেস্ট', quantity: '১২০ গ্রাম' },
      { itemName: 'হ্যান্ডওয়াশ রিফিল প্যাক', quantity: '২০০ মিলি' },
    ],
  },
  {
    name: 'ফ্যামিলি প্রিমিয়াম হাইজিন কেয়ার বক্স',
    slug: 'family-premium-hygiene-care-box',
    boxType: 'cleaning',
    frequency: 'monthly',
    frequencyText: 'প্রতি মাসে ১ বার',
    badge: 'সম্পূর্ণ হোম কেয়ার',
    shortDescription: 'বড় পরিবার ও সম্পূর্ণ মাসিক হোম কেয়ার সল্যুশন সহ প্রিমিয়াম ক্লিনিং বক্স।',
    description: 'সেরা ব্র্যান্ডের ফ্লোর ক্লিনার, ম্যাটিক ডিটারজেন্ট এবং টিস্যু সমৃদ্ধ সম্পূর্ণ মাসিক হাইজিন প্যাক।',
    thumbnail: '/images/monthly_cleaning_box.jpg',
    images: ['/images/monthly_cleaning_box.jpg'],
    regularPrice: 1650,
    subscriptionPrice: 1485,
    discountPercent: 10,
    freeShipping: true,
    isPinnedToHome: true,
    sortOrder: 2,
    status: 'active',
    allowOneTimePurchase: true,
    sku: 'CLN-FAM-PRM',
    tags: ['cleaning', 'premium', 'monthly'],
    idealFor: 'বড় পরিবার ও সম্পূর্ণ মাসিক হোম কেয়ার',
    items: [
      { itemName: 'সার্ফ এক্সেল ম্যাটিক ডিটারজেন্ট', quantity: '১ কেজি' },
      { itemName: 'হারপিক টয়লেট ক্লিনার', quantity: '৭৫০ মিলি' },
      { itemName: 'ভিম লিকুইড ডিশওয়াশ', quantity: '৫০০ মিলি' },
      { itemName: 'ডেটোল / স্যাভলন সাবান', quantity: '৪ পিস' },
      { itemName: 'লাইজল ফ্লোর ক্লিনার', quantity: '১ লিটার' },
      { itemName: 'ফেসিয়াল টিস্যু বক্স', quantity: '২টি' },
      { itemName: 'টয়লেট টিস্যু রোল', quantity: '৪ প্যাক' },
      { itemName: 'রুম ফ্রেশনার স্প্রে', quantity: '৩০০ মিলি' },
    ],
  },
  {
    name: 'অফিস হাইজিন ও কেয়ার বক্স (B2B)',
    slug: 'office-hygiene-care-box-b2b',
    boxType: 'cleaning',
    frequency: 'monthly',
    frequencyText: 'প্রতি মাসে ১ বার',
    badge: 'কর্পোরেট স্পেশাল',
    shortDescription: 'যেকোনো কর্পোরেট অফিস, শোরুম, ব্যাংক শাখা ও চেম্বারের সম্পূর্ণ মাসিক হাইজিন বক্স।',
    description: 'অফিস বা প্রতিষ্ঠানের স্বাস্থ্যকর পরিবেশ বজায় রাখতে সব ক্লিনিং পণ্য একসাথে সাশ্রয়ী মূল্যে।',
    thumbnail: '/images/monthly_cleaning_box.jpg',
    images: ['/images/monthly_cleaning_box.jpg'],
    regularPrice: 2450,
    subscriptionPrice: 2200,
    discountPercent: 10,
    freeShipping: true,
    isPinnedToHome: true,
    sortOrder: 3,
    status: 'active',
    allowOneTimePurchase: true,
    sku: 'CLN-OFF-PRO',
    tags: ['office', 'hygiene', 'b2b'],
    idealFor: 'অফিস, শোরুম ও বাণিজ্যিক প্রতিষ্ঠানের জন্য',
    items: [
      { itemName: 'ফেসিয়াল টিস্যু বক্স', quantity: '৪ বক্স' },
      { itemName: 'টয়লেট টিস্যু রোল', quantity: '১২ রোল প্যাক' },
      { itemName: 'বড় হ্যান্ডওয়াশ ডিসপেন্সার', quantity: '৫০০ মিলি ২ পিস' },
      { itemName: 'হারপিক টয়লেট ক্লিনার', quantity: '১ লিটার' },
      { itemName: 'ফ্লোর ক্লিনার লিকুইড', quantity: '১ লিটার' },
      { itemName: 'গ্লাস ক্লিনার স্প্রে', quantity: '৫০০ মিলি' },
      { itemName: 'রুম স্প্রে ফ্রেশনার', quantity: '৩০০ মিলি' },
    ],
  },
  {
    name: 'স্ট্যান্ডার্ড ফ্যামিলি উইকলি সবজি বক্স (৫ কেজি)',
    slug: 'standard-family-weekly-veggie-box-5kg',
    boxType: 'vegetable',
    frequency: 'weekly',
    frequencyText: 'প্রতি সপ্তাহে ১ বার',
    badge: 'ফ্রেশ ডেলিভারি',
    shortDescription: '৩–৪ জনের পরিবারের সারা সপ্তাহের ফ্রেশ শাকসবজির পারফেক্ট কম্বো।',
    description: 'ক্ষেত থেকে সরাসরি সংগৃহীত ১০০% সতেজ ও কীটনাশকমুক্ত শাকসবজি প্রতি সপ্তাহে আপনার ঠিকানায়।',
    thumbnail: '/images/weekly_veggie_box.jpg',
    images: ['/images/weekly_veggie_box.jpg'],
    regularPrice: 580,
    subscriptionPrice: 535,
    discountPercent: 8,
    freeShipping: true,
    isPinnedToHome: true,
    sortOrder: 1,
    status: 'active',
    allowOneTimePurchase: true,
    sku: 'VEG-BOX-STD',
    tags: ['vegetables', 'fresh', 'weekly'],
    idealFor: '৩–৪ জনের পরিবারের সারা সপ্তাহের ফ্রেশ শাকসবজি',
    items: [
      { itemName: 'আলু', quantity: '১.৫ কেজি' },
      { itemName: 'দেশি পেঁয়াজ', quantity: '১ কেজি' },
      { itemName: 'রসুন', quantity: '২৫০ গ্রাম' },
      { itemName: 'কাঁচামরিচ ও আদা', quantity: '২৫০ গ্রাম' },
      { itemName: 'তাজা লাউ / ফুলকপি', quantity: '১টি' },
      { itemName: 'বেগুন / পটল', quantity: '৫০০ গ্রাম' },
      { itemName: 'তাজা শাক', quantity: '২ আঁটি' },
    ],
  },
  {
    name: 'মেগা ফ্যামিলি উইকলি সবজি বক্স (৮–১০ কেজি)',
    slug: 'mega-family-weekly-veggie-box-8-10kg',
    boxType: 'vegetable',
    frequency: 'weekly',
    frequencyText: 'প্রতি সপ্তাহে ১ বার',
    badge: 'মেগা সাশ্রয়ী',
    shortDescription: '৫–৭ জনের একান্নবর্তী পরিবারের সম্পূর্ণ সাপ্তাহিক সবজির মেগা সাশ্রয়ী বক্স।',
    description: 'সপ্তাহের ৭ দিনের প্রয়োজনীয় সকল শাকসবজি এক বক্সে, সাশ্রয়ী ও ফ্রেশ ডেলিভারি।',
    thumbnail: '/images/weekly_veggie_box.jpg',
    images: ['/images/weekly_veggie_box.jpg'],
    regularPrice: 950,
    subscriptionPrice: 855,
    discountPercent: 10,
    freeShipping: true,
    isPinnedToHome: true,
    sortOrder: 2,
    status: 'active',
    allowOneTimePurchase: true,
    sku: 'VEG-BOX-MEGA',
    tags: ['vegetables', 'fresh', 'mega', 'weekly'],
    idealFor: '৫–৭ জনের একান্নবর্তী পরিবারের সম্পূর্ণ সাপ্তাহিক সবজি',
    items: [
      { itemName: 'আলু', quantity: '৩ কেজি' },
      { itemName: 'দেশি পেঁয়াজ', quantity: '২ কেজি' },
      { itemName: 'রসুন ও আদা', quantity: '৫০০ গ্রাম' },
      { itemName: 'কাঁচামরিচ', quantity: '২৫০ গ্রাম' },
      { itemName: 'টমেটো', quantity: '১ কেজি' },
      { itemName: 'শসা', quantity: '১ কেজি' },
      { itemName: 'তাজা লাউ', quantity: '১টি' },
      { itemName: 'পটল / বেগুন', quantity: '১ কেজি' },
      { itemName: 'তাজা শাক', quantity: '৩ আঁটি' },
    ],
  },
];

async function runSeed() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    for (const pkg of samplePackages) {
      await SubscriptionPackage.findOneAndUpdate(
        { slug: pkg.slug },
        { $set: pkg },
        { upsert: true, new: true }
      );
      console.log(`Synced package: ${pkg.name}`);
    }

    const count = await SubscriptionPackage.countDocuments();
    console.log(`Total SubscriptionPackages in MongoDB: ${count}`);
    await mongoose.disconnect();
    console.log('Seed completed successfully!');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

runSeed();
