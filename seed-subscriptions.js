const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || 'mongodb+srv://sobjihaat:DWzOWK8mKApKZazg@cluster0.ym9ehhj.mongodb.net/?appName=Cluster0';

async function seed() {
  await mongoose.connect(uri);
  const db = mongoose.connection.collection('products');

  const cleaningCatId = new mongoose.Types.ObjectId('6a4cb7d82c8343398a935914');
  const vegCatId = new mongoose.Types.ObjectId('6a453744f3a8fd41bf2b6f56');

  const productsToSeed = [
    {
      name: 'ফ্যামিলি বেসিক ক্লিনিং বক্স',
      slug: 'family-basic-cleaning-box',
      shortDescription: '৩–৪ জনের সাধারণ পরিবারের মাসিক ক্লিনিং ও হাইজিন সামগ্রীর সাশ্রয়ী কম্বো বক্স।',
      description: 'এই বক্সে রয়েছে: হুইল/সার্ফ এক্সেল ডিটারজেন্ট ১ কেজি, হারপিক টয়লেট ক্লিনার ৭৫০ মিলি, ভিম বার/লিকুইড ৫০০ গ্রাম/মিলি, লাইফবয়/ডেটোল সাবান ২টি, টুথপেস্ট ১২০ গ্রাম, হ্যান্ডওয়াশ রিফিল প্যাক।',
      regularPrice: 950,
      salePrice: 875,
      costPrice: 750,
      discountPercent: 8,
      stock: 100,
      sku: 'CLN-FAM-BSC',
      thumbnail: '/images/monthly_cleaning_box.jpg',
      images: ['/images/monthly_cleaning_box.jpg'],
      categoryID: cleaningCatId,
      productType: 'combo',
      status: 'active',
      isSubscriptionAvailable: true,
      subscriptionFrequency: 'monthly',
      subscriptionDiscountPercent: 8,
      freeShipping: true,
      tags: ['cleaning', 'household', 'subscription', 'monthly-box', 'harpic', 'detergent'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'ফ্যামিলি প্রিমিয়াম হাইজিন কেয়ার বক্স',
      slug: 'family-premium-hygiene-care-box',
      shortDescription: 'বড় পরিবার ও সম্পূর্ণ মাসিক হোম কেয়ার সল্যুশন সহ প্রিমিয়াম ক্লিনিং বক্স।',
      description: 'এই বক্সে রয়েছে: সার্ফ এক্সেল ম্যাটিক ১ কেজি, হারপিক টয়লেট ক্লিনার ৭৫০ মিলি, ভিম লিকুইড ৫০০ মিলি, ডেটোল/স্যাভলন ৪ পিস, লাইজল ফ্লোর ক্লিনার ১ লিটার, ফেসিয়াল টিস্যু ২টি, টয়লেট টিস্যু ৪ রোল, রুম স্প্রে, কোলগেট টোটাল।',
      regularPrice: 1650,
      salePrice: 1485,
      costPrice: 1300,
      discountPercent: 10,
      stock: 50,
      sku: 'CLN-FAM-PRM',
      thumbnail: '/images/monthly_cleaning_box.jpg',
      images: ['/images/monthly_cleaning_box.jpg'],
      categoryID: cleaningCatId,
      productType: 'combo',
      status: 'active',
      isSubscriptionAvailable: true,
      subscriptionFrequency: 'monthly',
      subscriptionDiscountPercent: 10,
      freeShipping: true,
      tags: ['cleaning', 'premium', 'subscription', 'monthly-box', 'home-care'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'অফিস হাইজিন ও কেয়ার বক্স (B2B)',
      slug: 'office-hygiene-care-box-b2b',
      shortDescription: 'যেকোনো কর্পোরেট অফিস, শোরুম, ব্যাংক শাখা ও চেম্বারের সম্পূর্ণ মাসিক হাইজিন বক্স।',
      description: 'এই বক্সে রয়েছে: ফেসিয়াল টিস্যু ৪ বক্স, টয়লেট টিস্যু ১২ রোল প্যাক, বড় হ্যান্ডওয়াশ ৫০০ মিলি ২টি, হারপিক ১ লিটার, ফ্লোর ক্লিনার ১ লিটার, গ্লাস ক্লিনার স্প্রে, রুম স্প্রে ৩০০ মিলি, ডিশওয়াশ লিকুইড।',
      regularPrice: 2450,
      salePrice: 2200,
      costPrice: 1900,
      discountPercent: 10,
      stock: 40,
      sku: 'CLN-OFF-PRO',
      thumbnail: '/images/monthly_cleaning_box.jpg',
      images: ['/images/monthly_cleaning_box.jpg'],
      categoryID: cleaningCatId,
      productType: 'combo',
      status: 'active',
      isSubscriptionAvailable: true,
      subscriptionFrequency: 'monthly',
      subscriptionDiscountPercent: 10,
      freeShipping: true,
      tags: ['office', 'hygiene', 'b2b', 'subscription', 'tissue', 'cleaner'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'স্ট্যান্ডার্ড ফ্যামিলি উইকলি সবজি বক্স (৫ কেজি)',
      slug: 'standard-family-weekly-veggie-box-5kg',
      shortDescription: '৩–৪ জনের পরিবারের সারা সপ্তাহের ফ্রেশ শাকসবজির পারফেক্ট কম্বো।',
      description: 'বক্সে থাকবে: আলু ১.৫ কেজি, দেশি পেঁয়াজ ১ কেজি, রসুন ২৫০ গ্রাম, কাঁচামরিচ ও আদা ২৫০ গ্রাম, তাজা লাউ/ফুলকপি ১টি, বেগুন/পটল ৫০০ গ্রাম, তাজা শাক ২ আঁটি।',
      regularPrice: 580,
      salePrice: 535,
      costPrice: 400,
      discountPercent: 8,
      stock: 80,
      sku: 'VEG-BOX-STD',
      thumbnail: '/images/weekly_veggie_box.jpg',
      images: ['/images/weekly_veggie_box.jpg'],
      categoryID: vegCatId,
      productType: 'combo',
      status: 'active',
      isSubscriptionAvailable: true,
      subscriptionFrequency: 'weekly',
      subscriptionDiscountPercent: 8,
      freeShipping: true,
      tags: ['vegetables', 'weekly-box', 'subscription', 'fresh', 'combo'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'মেগা ফ্যামিলি উইকলি সবজি বক্স (৮–১০ কেজি)',
      slug: 'mega-family-weekly-veggie-box-8-10kg',
      shortDescription: '৫–৭ জনের একান্নবর্তী পরিবারের সম্পূর্ণ সাপ্তাহিক সবজির মেগা সাশ্রয়ী বক্স।',
      description: 'বক্সে থাকবে: আলু ৩ কেজি, পেঁয়াজ ২ কেজি, রসুন ৫০০ গ্রাম, আদা ২৫০ গ্রাম, মরিচ ২৫০ গ্রাম, টমেটো ১ কেজি, শসা ১ কেজি, লাউ ১টি, মিষ্টি কুমড়া ১ ফালি, পটল/বেগুন ১ কেজি, তাজা শাক ৩ আঁটি।',
      regularPrice: 950,
      salePrice: 855,
      costPrice: 700,
      discountPercent: 10,
      stock: 60,
      sku: 'VEG-BOX-MEGA',
      thumbnail: '/images/weekly_veggie_box.jpg',
      images: ['/images/weekly_veggie_box.jpg'],
      categoryID: vegCatId,
      productType: 'combo',
      status: 'active',
      isSubscriptionAvailable: true,
      subscriptionFrequency: 'weekly',
      subscriptionDiscountPercent: 10,
      freeShipping: true,
      tags: ['vegetables', 'mega-box', 'weekly', 'subscription', 'fresh'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ];

  for (const p of productsToSeed) {
    const existing = await db.findOne({ slug: p.slug });
    if (existing) {
      await db.updateOne({ _id: existing._id }, { $set: p });
      console.log('Updated in DB:', p.name);
    } else {
      await db.insertOne(p);
      console.log('Inserted in DB:', p.name);
    }
  }

  const count = await db.countDocuments({ isSubscriptionAvailable: true });
  console.log('Total Subscription Products now in MongoDB:', count);
  await mongoose.disconnect();
}

seed().catch(console.error);
