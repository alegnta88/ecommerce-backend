import express from 'express';
import {
  addProduct,
  listProduct,
  removeProduct,
  singleProduct,
  approveProduct,
  rejectProduct,
  updateStock
} from '../controllers/productController.js';
import upload from '../middleware/multer.js';
import adminAuth from '../middleware/adminAuth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import adminOrUserAuth from '../middleware/adminOrUserAuth.js';

const productRouter = express.Router();

productRouter.post('/add', adminOrUserAuth, upload.single('image'), addProduct);

productRouter.get('/', optionalAuth, listProduct);

productRouter.get('/:id', optionalAuth, singleProduct);

productRouter.delete('/:id', adminOrUserAuth, removeProduct);
productRouter.put('/:id/stock', adminOrUserAuth, updateStock);

productRouter.put('/:id/approve', adminAuth, approveProduct);
productRouter.put('/:id/reject', adminAuth, rejectProduct);

export default productRouter;