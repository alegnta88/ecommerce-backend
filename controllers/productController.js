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

export const addProduct = asyncHandler(async (req, res) => {
  const user = req.user;
  const isAdmin = user?.role === "admin";

  const productData = { 
    ...req.body, 
    stock: Number(req.body.stock) || 0 
  };

  const product = await createProduct(
    productData,
    req.files || (req.file ? [req.file] : []),
    user
  );

  res.status(201).json({
    success: true,
    message: isAdmin
      ? "Product added and approved successfully"
      : "Product submitted for approval",
    product,
  });
});


export const listProduct = asyncHandler(async (req, res) => {
  const user = req.user;
  const data = await getProducts(req.query, user);

  res.status(200).json({ success: true, ...data });
});

export const removeProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteProduct(id);

  res.status(200).json({
    success: true,
    message: "Product removed successfully",
  });
});

export const singleProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await getProductById(id);

  res.status(200).json({
    success: true,
    product,
  });
});

import asyncHandler from "express-async-handler";

export const approveProduct = asyncHandler(async (req, res) => {
  const product = await approveProductById(req.params.id);

  res.status(200).json({
    success: true,
    message: "Product approved successfully",
    product,
  });
});

export const rejectProduct = asyncHandler(async (req, res) => {
  const product = await rejectProductById(req.params.id);

  res.status(200).json({
    success: true,
    message: "Product rejected successfully",
    product,
  });
});

export const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  const product = await updateStockById(id, stock);

  res.status(200).json({
    success: true,
    product,
  });
});