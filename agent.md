# 🛒 E-Commerce Transformation Roadmap: Gadgets & Clothing

> **Project Target:** SobjiHaat (Grocery) প্রজেক্টকে সম্পূর্ণভাবে একটি আধুনিক **Gadget & Clothing E-Commerce** প্ল্যাটফর্মে রূপান্তর করা।  
> **Key Directives:**  
> 1. **Rider সিস্টেম সম্পূর্ণরূপে মুছে ফেলা** (On-demand grocery rider বাদ দিয়ে স্ট্যান্ডার্ড ই-কমার্স কুরিয়ার ডেলিভারি মডেল)।  
> 2. **Backend-First Workflow** (আগে ব্যাকএন্ড মডেল, লজিক ও এপিআই সম্পূর্ণ প্রস্তুত করা)।  
> 3. **Clothing & Gadget ভ্যারিয়েন্ট আর্কিটেকচার** (Clothing এর জন্য Color, Size এবং Gadget এর জন্য Simple/Variant ও Specifications/Warranty সাপোর্ট)।  
> 4. **মার্কেটিং ফিচার সম্পূর্ণ অক্ষত রাখা (STRICTLY PRESERVED):** Meta Pixel (CAPI), Google Tag Manager (GTM), GA4, TikTok Pixel, Coupons/Discounts, Promotional Banners, Newsletter Subscribers এবং SEO মেটাট্যাগ কোনোভাবেই রিমুভ করা যাবে না।

---

## 🛡️ Protected Marketing Features (কোনোভাবেই মোছা যাবে না)

নিচের সমস্ত ফিচার এবং মডিউল সম্পূর্ণ সুরক্ষিত থাকবে এবং প্রয়োজনে Clothing/Gadget এর সাথে আরও অপটিমাইজ করা হবে:
- ✅ **Marketing Tracking & Analytics (`src/app/modules/settings/marketingSetting.model.ts`):**
  - **Meta Pixel & Facebook CAPI** (Pixel ID, Access Token, Test Event Code)
  - **Google Tag Manager (GTM)** (Container ID)
  - **Google Analytics 4 (GA4)** (Measurement ID, API Secret)
  - **TikTok Pixel & Events API** (Pixel Code, Access Token)
- ✅ **Coupon & Discount Engine (`src/app/modules/coupon/`):**
  - শতকরা (%) ও ফিক্সড টাকার কুপন কোড
  - মিনিমাম পারচেজ লিমিট, মেয়াদ ও সর্বোচ্চ ব্যবহার সীমা
- ✅ **Promotional Banners (`src/app/modules/banner/`):**
  - হিরো স্লাইডার, কালেকশন ব্যানার, অফার ও সেল প্রমোশন ব্যানার (Desktop & Mobile)
- ✅ **Newsletter Subscribers & Email Marketing (`src/app/modules/subscriber/` ও `src/app/modules/email/`):**
  - নিউজলেটার সাবস্ক্রাইবার তালিকা ও প্রমোশনাল ইমেইল হ্যান্ডলিং
- ✅ **SEO & Social Sharing Fields (Product Model):**
  - `metaTitle`, `metaDescription`, `tags`, OpenGraph/Social প্রিভিউ ফিল্ডস
- ✅ **Sales & Merchandising Flags:**
  - `isFeatured`, `isOnSale`, `isNewArrival`, `discountPercent`, `salePrice`

---

## 📌 Phase 1: Rider System & Grocery Components Removal (Backend Cleanup) - [COMPLETED ✅]

### ১.১ Rider সংক্রান্ত সম্পূর্ণ মডিউল ডিলিট করা
- [x] ডিলিট করা হয়েছে:
  - `src/app/modules/rider/` (সম্পূর্ণ ফোল্ডার)
  - `src/app/modules/riderDashboard/` (সম্পূর্ণ ফোল্ডার)
  - `src/app/modules/riderPayout/` (সম্পূর্ণ ফোল্ডার)
  - গ্রোসারি `subscription` ও `subscriptionPackage` ফোল্ডার
- [x] `src/app/routes/routes.ts` থেকে রাইডার সংক্রান্ত সব রাউট আনরেজিস্টার ও ইমপোর্ট রিমুভ করা:
  - `/rider`
  - `/rider-dashboard`
  - `/rider-payout`
- [x] মার্কেটিং ট্র্যাকিং (`/tracking` - Meta CAPI, TikTok Events, GA4) অক্ষত ও সুরক্ষিত রাখা হয়েছে।

### ১.২ User & Auth Module থেকে Rider Role বাদ দেওয়া
- [x] `src/app/modules/auth/user.interface.ts`:
  - `role: "user" | "admin"` রাখা হয়েছে (rider সরানো হয়েছে)।
- [x] `src/app/modules/auth/user.model.ts`:
  - `role` enum থেকে `"rider"` সরানো হয়েছে।

### ১.৩ Order Module থেকে Rider লজিক সম্পূর্ণ পরিষ্কার করা
- [x] `order.interface.ts` ও `order.model.ts`:
  - রিমুভ করা হয়েছে: `assignedRider`, `riderAssignedAt`, `riderCommission`, `returnedBy: "rider"`.
  - স্ট্যান্ডার্ড কুরিয়ার ট্র্যাকিং ফিল্ডস যোগ করা হয়েছে: `courierName`, `trackingCode`, `consignmentId`.
- [x] `order.service.ts` ও `order.controller.ts`:
  - রাইডার সংক্রান্ত সমস্ত মেথড (`acceptOrderByRider`, `rejectOrderByRider`, `getMyAssignedOrders`, ইত্যাদি) বাদ দেওয়া হয়েছে।
  - কুরিয়ার ট্র্যাকিং আপডেট মেথড `updateCourierInfo` যোগ করা হয়েছে।
- [x] `order.route.ts`:
  - সব `/rider/...` রাউট মুছে ফেলা হয়েছে এবং `/admin/:id/courier` যোগ করা হয়েছে।

### ১.৪ Socket.io & অন্যান্য গ্রোসারি সার্ভিসেস ক্লিনআপ
- [x] `src/app/config/socket.ts`:
  - রাইডার রুম ও লোকেশন ইভেন্ট মুছে ফেলা হয়েছে, অ্যাডমিন ইভেন্ট বজায় রাখা হয়েছে।

---

## 📌 Phase 2: Product Model & Variant Architecture (Gadgets & Clothing) - [COMPLETED ✅]

- [x] `product.interface.ts` ও `product.model.ts` রি-ডিজাইন সম্পন্ন:
  - **Clothing Support:** Color (`name`, `hexCode`, `image`), Size (S, M, L, XL, 32, ইত্যাদি), `sizeGuide`, ভ্যারিয়েন্ট অনুযায়ী আলাদা `stock` ও `regularPrice`/`salePrice`।
  - **Gadget Support:** Simple Product (no variants) অথবা Variants by Color/Storage, `specifications` (Key-Value) এবং `warranty` (duration, type, details)।
  - কোনো `unitID` বা `weightOrVolume` রিকোয়ার্ড রাখা হয়নি (ঐচ্ছিক করা হয়েছে)।
- [x] `product.service.ts`:
  - Create ও Update এ ডাইনামিক ভ্যারিয়েন্ট হ্যান্ডলিং ও স্টক এগ্রিগেশন সম্পন্ন।
  - সমস্ত মার্কেটিং ও এসইও ফিল্ড (`metaTitle`, `metaDescription`, `tags`, `isFeatured`, `isOnSale`, ইত্যাদি) অক্ষত রাখা হয়েছে।

---

## 📌 Phase 3: Cart, Checkout & Order Processing Update - [COMPLETED ✅]

- [x] `IOrderItem` এ `selectedAttributes` (Color, Size, Storage) ও `variantID` সাপোর্ট যুক্ত।
- [x] অর্ডার প্লেস ও কনফার্মেশনে ভ্যারিয়েন্ট স্টক ডিডাকশন ও রিস্টোরেশন লজিক হালনাগাদ।
- [x] `shipping` মডিউল থেকে `riderCommission` সম্পূর্ণ পরিষ্কার।

---

## 📌 Phase 4: Categories & Brand Seeding for Gadgets & Clothing

- [ ] ক্যাটাগরি স্ট্রাকচার আপডেট:
  - **Clothing:**
    - Men (T-Shirts, Polo, Shirts, Panjabi, Jeans, Trousers, Jackets)
    - Women (Sarees, Kurtis, Tops, Dresses, Modest Wear)
    - Kids & Teens
    - Footwear & Accessories
  - **Gadgets:**
    - Smart Watches & Fitness Trackers
    - Audio (Earbuds, Headphones, Bluetooth Speakers)
    - Mobile Accessories (Fast Chargers, Cables, Power Banks, Cases)
    - Computer & Gaming Accessories (Keyboards, Mice, Desk Pads, Webcams)
    - Smart Home & Lifestyle Tech
- [ ] ব্র্যান্ড মডিউল সমৃদ্ধ করা (Tech brands & Fashion brands)।

---

## 📌 Phase 5: Dashboard (`tech-mahmud-dashboard`) Integration Roadmap

- [ ] **Rider অংশ মুছে ফেলা:**
  - Admin সাইডবার থেকে `Riders`, `Rider Applications`, `Rider Payouts` লিংক ও পেজগুলো মুছে ফেলা।
- [ ] **Product Management UI আপগ্রেড:**
  - Product Add/Edit ফর্মে `Product Type` সিলেক্টর (Clothing / Gadget)।
  - **Clothing সিলেক্ট করলে:** Color Selector (Color name + Color picker) ও Size Checkbox (S, M, L, XL, XXL, etc.)। ভ্যারিয়েন্ট টেবিল স্বয়ংক্রিয়ভাবে জেনারেট হওয়া যেখানে প্রতিটির Stock, SKU, Price ও Image দেয়া যাবে।
  - **Gadget সিলেক্ট করলে:** Simple Product নাকি Variant Product তা টগল করার অপশন। সাথে Warranty Duration ও Specifications Key-Value ইনপুট।
- [ ] **Order Management UI আপগ্রেড:**
  - Rider assign করার ড্রপডাউন বাদ দিয়ে "Courier Selection" ও "Consignment / Tracking Number" ইনপুট যোগ করা।

---

## 📌 Phase 6: Frontend (`tech-mahmud-frontend`) Integration Roadmap

- [ ] রাইডার জয়েন পেজ (`/rider-apply`) ও রাইডার সংক্রান্ত যেকোনো ব্যানার/লিংক রিমুভ।
- [ ] **Product Card & Listing:**
  - এভেইলেবল কালার ডটস বা সাইজ ব্যাজ দেখানো।
  - আধুনিক গ্যাজেট এবং ক্লথিং থিমের ব্যানার ও কালেকশন।
- [ ] **Product Details Page (PDP):**
  - ক্লথিং পণ্যের জন্য ইন্টারেক্টিভ Color Swatches এবং Size Selector।
  - সাইজ সিলেক্ট করলে রিয়েল-টাইম স্টক স্ট্যাটাস আপডেট ("Only 2 left in size XL" বা "Out of Stock")।
  - সাইজ গাইড মোডাল।
  - গ্যাজেট পণ্যের জন্য Warranty ব্যাজ এবং স্পেসিফিকেশন টেবিল।
- [ ] **Cart & Checkout Drawer:**
  - কার্ট আইটেমের নিচে সিলেক্টেড Color ও Size স্পষ্টভাবে প্রদর্শন।

---

## 🚀 Execution Order (কাজের ধারাবাহিকতা)

1. **Step 1:** Backend এ `agent.md` তৈরি সম্পন্ন (Done ✅)।
2. **Step 2:** Backend থেকে রাইডার সম্পর্কিত সব ফাইল ও কোড ক্লিন করা (`rider`, `riderDashboard`, `riderPayout`, `User.role`, `Order.assignedRider`) (Done ✅)।
3. **Step 3:** Product Model, Interface, Controller ও Service কে Clothing & Gadget ভ্যারিয়েন্ট সহ রি-রাইট করা (Done ✅)।
4. **Step 4:** Order Model ও Controller এ ভ্যারিয়েন্ট হ্যান্ডলিং ও স্টক ম্যানেজমেন্ট আপডেট করা (Done ✅)।
5. **Step 5:** Backend টেস্ট ও ভ্যালিডেশন সম্পন্ন করা (`npm run build` cleanly passed ✅)।
6. **Step 6:** Dashboard (`tech-mahmud-dashboard`) এ প্রোডাক্ট ভ্যারিয়েন্ট ফর্ম ও অর্ডার আপডেট করা (Next ⏳)।
7. **Step 7:** Frontend এ প্রোডাক্ট ডিটেইলস পেজে সাইজ/কালার সিলেক্টর ও গ্যাজেট স্পেক্স বসানো (Pending ⏳)।

