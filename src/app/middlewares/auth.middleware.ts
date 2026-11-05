import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../modules/auth/user.model";
import catchAsync from "../utils/catchAsync";


// export const isAuthenticated = catchAsync(
//   async (req: any, res: Response, next: NextFunction) => {
//     let token = req.cookies?.token;

//     // Header থেকে টোকেন চেক করো (যদি cookie না থাকে)
//     if (!token && req.headers.authorization) {
//       token = req.headers.authorization.split(" ")[1]; // Bearer <token>
//     }

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "Login first to access this resource",
//       });
//     }

//     try {
//       const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
//       const user = await User.findById(decoded.id);

//       if (!user) {
//         return res.status(401).json({
//           success: false,
//           message: "User not found",
//         });
//       }

//       req.user = user;
//       next();
//     } catch (error) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid or expired token",
//       });
//     }
//   }
// );

// --- Admin Role Middleware ---

export const isAuthenticated = catchAsync(
  async (req: any, res: Response, next: NextFunction) => {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Login first to access this resource",
      });
    }

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);

      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.status === "blocked") {
        return res.status(403).json({
          success: false,
          message: "Your account is blocked",
        });
      }

      req.user = user;
      next();
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
    }
  }
);

// export const isAuthenticated = catchAsync(
//   async (req: any, res: Response, next: NextFunction) => {
//     let token = req.cookies?.accessToken;

//     if (!token && req.headers.authorization) {
//       token = req.headers.authorization.split(" ")[1]; // Bearer <token>
//     }

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "Login first to access this resource",
//       });
//     }

//     try {
//       const decoded: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
//       const user = await User.findById(decoded.id);

//       if (!user) {
//         return res.status(401).json({
//           success: false,
//           message: "User not found",
//         });
//       }

//       if (user.status === "blocked") {
//         return res.status(403).json({
//           success: false,
//           message: "Your account is blocked",
//         });
//       }

//       req.user = user;
//       next();
//     } catch (error) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid or expired access token",
//       });
//     }
//   }
// );

export const isAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: `Role (${req.user.role}) is not allowed to access this resource`,
    });
  }

  next();
};

export const optionalAuth = async (req: any, res: Response, next: NextFunction) => {
  let token = req.cookies?.accessToken || req.cookies?.token;

  if (!token && req.headers.authorization) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "defaultsecret";
      const decoded: any = jwt.verify(token, secret);
      const user = await User.findById(decoded.id);

      if (user && user.status !== "blocked") {
        req.user = user;
      }
    } catch {
      // Ignore token decode failures for optional auth
    }
  }

  next();
};

