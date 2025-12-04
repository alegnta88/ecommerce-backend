import ProductModel from '../models/productModel.js';
import CategoryModel from '../models/categoryModel.js';
import { uploadImage, deleteImage } from './cloudinaryService.js';
import mongoose from 'mongoose';

export const createProduct = async (data, files, user) => {
  const { name, price, description, category, subcategory, sizes, bestseller, stock } = data;
  if (!name || !price || !description || !category || !stock) {
    throw new Error("Please provide all required fields.");
  }
  if (isNaN(price) || price <= 0) {
    throw new Error("Invalid product price.");
  }
  if (stock != null && (isNaN(stock) || stock < 0)) {
    throw new Error("Stock must be a non-negative number");
  }
  const categoryDoc = await CategoryModel.findById(category).catch(() => null);
  if (!categoryDoc) {
    throw new Error("The selected category does not exist. Please choose a valid category.");
  }
  const imageArray = [];
  if (files?.length > 0) {
    for (const file of files) {
      const url = await uploadImage(file.path);
      imageArray.push(url);
    }
  }
  if (imageArray.length === 0) {
    throw new Error("At least one product image is required.");
  }
  let parsedSizes = [];
  if (sizes) {
    try {
      parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
    } catch {
      parsedSizes = Array.isArray(sizes) ? sizes : [sizes];
    }
  }

  const productStatus = user?.role === "admin" ? "approved" : "pending";

  const product = new ProductModel({
    name: name.trim(),
    price: Number(price),
    description: description.trim(),
    image: imageArray,
    category: categoryDoc._id,
    subcategory: subcategory?.trim() || "",
    sizes: parsedSizes,
    bestseller: bestseller === "true" || bestseller === true,
    stock: Number(stock) || 0,
    status: productStatus,
    addedBy: user?._id,
    date: Date.now(),
  });

  return await product.save();
};

export const getProducts = async (queryParams, user) => {
  const limit = parseInt(queryParams.limit) || 8;
  const cursor = queryParams.cursor;
  const filter = {};

  if (user?.role !== "admin") {
    filter.status = "approved";
  } else if (queryParams.status) {
    filter.status = queryParams.status;
  }

  if (queryParams.category && mongoose.Types.ObjectId.isValid(queryParams.category)) {
    filter.category = queryParams.category;
  }

  const cursorQuery = cursor ? { _id: { $lt: cursor } } : {};
  const products = await ProductModel.find({ ...filter, ...cursorQuery })
    .sort({ _id: -1 })
    .limit(limit + 1);

  const hasMore = products.length > limit;
  const resultProducts = hasMore ? products.slice(0, limit) : products;
  const nextCursor = hasMore ? resultProducts[resultProducts.length - 1]._id : null;

  return { products: resultProducts, nextCursor, hasMore };
};

export const deleteProduct = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid product ID');
  }
  const product = await ProductModel.findById(id);
  if (!product) throw new Error('Product not found');

  if (product.image?.length > 0) {
    for (const imageUrl of product.image) {
      await deleteImage(imageUrl);
    }
  }

  await ProductModel.findByIdAndDelete(id);
  return true;
};

export const getProductById = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid product ID');
  }

  const filter = { _id: id };
  if (!user || user.role !== "admin") {
    filter.status = "approved";
  }

  const product = await ProductModel.findOne(filter);

  if (!product) throw new Error('Product not found or not accessible');

  return product;
};

export const approveProductById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid product ID');
  const product = await ProductModel.findById(id);
  if (!product) throw new Error('Product not found');
  product.status = 'approved';
  await product.save();
  return product;
};

export const rejectProductById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid product ID');
  const product = await ProductModel.findById(id);
  if (!product) throw new Error('Product not found');
  product.status = 'rejected';
  await product.save();
  return product;
};

export const updateStockById = async (id, stock) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid product ID');
  if (stock == null || stock < 0) throw new Error('Stock must be a non-negative number');

  const product = await ProductModel.findByIdAndUpdate(
    id,
    { stock: Number(stock) },
    { new: true }
  );
  if (!product) throw new Error('Product not found');
  return product;
};