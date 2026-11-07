import { Router } from "express";
import { UserRoutes } from "../modules/auth/user.route";
import { SubscriberRoutes } from "../modules/subscriber/subscriber.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { CategoryRoutes } from "../modules/category/category.route";
import { ProductRoutes } from "../modules/product/product.route";
import { SettingRoutes } from "../modules/settings/setting.route";
import { CustomerRoutes } from "../modules/customer/customer.route";
import { PaymentRoutes } from "../modules/payment/payment.routes";
import { ContactRoutes } from "../modules/email/email.route";
import { UnitRoutes } from "../modules/unit/unit.route";
import { BrandRoutes } from "../modules/brand/brand.route";
import { OrderRoutes } from "../modules/order/order.route";
import { AreaRoutes } from "../modules/area/area.route";
import { ShippingRoutes } from "../modules/shipping/shipping.route";
import { siteSettingRoutes } from "../modules/sitesettings/siteSettingsRoute";
import { DashboardRoutes } from "../modules/dashboard/dashboard.route";
import { AreaRequestRoutes } from "../modules/areaRequest/areaRequest.route";
import { CouponRoutes } from "../modules/coupon/coupon.route";
import { BannerRoutes } from "../modules/banner/banner.route";
import { TrackingRoutes } from "../modules/traking/tracking.routes";

const router = Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: UserRoutes,
  },
  {
    path: "/categories",
    route: CategoryRoutes,
  },
  {
    path: "/products",
    route: ProductRoutes,
  },
  {
    path: "/order",
    route: OrderRoutes,
  },
  {
    path: "/subscribers",
    route: SubscriberRoutes,
  },
  {
    path: "/reviews",
    route: ReviewRoutes,
  },
  {
    path: "/settings",
    route: SettingRoutes,
  },
  {
    path: "/customers",
    route: CustomerRoutes,
  },
  {
    path: "/users",
    route: CustomerRoutes,
  },
  {
    path: "/payment",
    route: PaymentRoutes,
  },
  {
    path: "/contact",
    route: ContactRoutes,
  },
  {
    path: "/unit",
    route: UnitRoutes,
  },
  {
    path: "/brands",
    route: BrandRoutes,
  },
  {
    path: "/area",
    route: AreaRoutes,
  },
  {
    path: "/shipping",
    route: ShippingRoutes,
  },
  {
    path: "/siteSettings",
    route: siteSettingRoutes,
  },
  {
    path: "/dashboard",
    route: DashboardRoutes,
  },
  {
    path: "/area-requests",
    route: AreaRequestRoutes,
  },
  {
    path: "/coupons",
    route: CouponRoutes,
  },
  {
    path: "/banners",
    route: BannerRoutes,
  },
  {
    path: "/tracking",
    route: TrackingRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
