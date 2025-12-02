import { 
  createProduct, 
  getProducts, 
  deleteProduct, 
  getProductById, 
  approveProductById, 
  rejectProductById 
} from '../services/productService.js';
import logger from "../utils/logger.js";
import asyncHandler from 'express-async-handler';

export const addProduct = async (req, res) => {
  try {
    const user = req.user;
    const isAdmin = user?.role === 'admin';

    const productData = { ...req.body, stock: Number(req.body.stock) || 0 };

    const product = await createProduct(
      productData,
      req.files || (req.file ? [req.file] : []),
      user
    );

    res.status(201).json({
      success: true,
      message: isAdmin
        ? 'Product added and approved successfully'
        : 'Product submitted for approval',
      product,
    });
  } catch (error) {
    logger.error("Error adding product: %o", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const listProduct = asyncHandler(async (req, res) => {
  const user = req.user;
  const data = await getProducts(req.query, user);

  res.status(200).json({ success: true, ...data });
});

export const removeProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteProduct(id);
    res.status(200).json({ success: true, message: 'Product removed successfully' });
  } catch (error) {
    logger.error("Error removing product: %o", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const singleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await getProductById(id);
    res.status(200).json({ success: true, product });
  } catch (error) {
    logger.error("Error fetching product: %o", error);
    res.status(404).json({ success: false, message: error.message });
  }
};

export const approveProduct = async (req, res) => {
  try {
    const product = await approveProductById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Product approved successfully',
      product,
    });
  } catch (error) {
    logger.error("Error approving product: %o", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectProduct = async (req, res) => {
  try {
    const product = await rejectProductById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Product rejected successfully',
      product,
    });
  } catch (error) {
    logger.error("Error rejecting product: %o", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    const product = await updateStockById(id, stock);

    res.status(200).json({ success: true, product });
  } catch (error) {
    logger.error("Error updating stock: %o", error);
    res.status(400).json({ success: false, message: error.message });
  }
};