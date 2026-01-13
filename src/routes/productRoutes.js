import express from "express";
import * as productController from "../controllers/productController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.get("/", productController.getProducts);
router.post("/", productController.createProduct);
router.put("/:productId", productController.updateProduct);
router.delete("/:productId", productController.deleteProduct);

export default router;
