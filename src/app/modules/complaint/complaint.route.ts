import { Router } from "express";
import { ComplaintControllers } from "./complaint.controller";
import { upload } from "../../middlewares/multer.middleware";
import { isAuthenticated } from "../../middlewares/auth.middleware";

const router = Router();

router.get('/my-complaints', isAuthenticated, ComplaintControllers.getMyComplaints);

router.post(
  "/",
  isAuthenticated,
  upload.array("images", 5),
  ComplaintControllers.createComplaint,
);

router.get("/", ComplaintControllers.getAllComplaints);

router.get("/:id", ComplaintControllers.getSingleComplaint);

router.patch("/:id", ComplaintControllers.updateComplaint);

router.delete("/:id", ComplaintControllers.deleteComplaint);

export const ComplaintRoutes = router;
