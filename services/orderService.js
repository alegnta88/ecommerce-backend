import OrderModel from '../models/orderModel.js';
import ProductModel from '../models/productModel.js';
import mongoose from 'mongoose';
import { sendSMS } from '../utils/sendSMS.js';
import CustomerModel from '../models/customerModel.js';

export const createOrderService = async (customer, items, shippingAddress) => {
  if (!items || items.length === 0) throw new Error("No items in the order");

  const orderItems = [];
  let totalAmount = 0;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        throw new Error(`Invalid product ID ${item.product}`);
      }

      const quantity = item.quantity || 1;

      // Atomic find and decrement using session
      const product = await ProductModel.findOneAndUpdate(
        { _id: item.product, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true, session }
      );

      if (!product) {
        // Fallback check to provide a descriptive error message
        const existingProduct = await ProductModel.findById(item.product).session(session);
        if (!existingProduct) {
          throw new Error(`Product not found: ${item.product}`);
        } else {
          throw new Error(`Insufficient stock for ${existingProduct.name}. Available: ${existingProduct.stock}`);
        }
      }

      totalAmount += product.price * quantity;

      orderItems.push({
        product: product._id,
        quantity,
        price: product.price,
      });
    }

    const order = new OrderModel({
      customer: customer._id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentStatus: "pending",
      orderStatus: "pending",
    });

    await order.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// let customer view their orders
export const getOrdersByCustomerService = async (customerId) => {
  return await OrderModel.find({ customer: customerId }).populate('items.product');
};

export const getAllOrdersService = async () => {
  return await OrderModel.find()
    .populate('customer', 'name email')
    .populate('items.product');
};

export const updateOrderStatusService = async (user, orderId, newStatus) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new Error('Order not found');

  if (user.role !== 'admin') {
    throw new Error('You are not authorized to update this order');
  }

  if (order.orderStatus === newStatus) {
    throw new Error(`Order is already in '${newStatus}' status`);
  }

  const allowedTransitions = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  const validStatuses = Object.keys(allowedTransitions);
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  if (!allowedTransitions[order.orderStatus].includes(newStatus)) {
    throw new Error(`You cannot change status from ${order.orderStatus} to ${newStatus}`);
  }

  order.orderStatus = newStatus;
  await order.save();

  const customer = await CustomerModel.findById(order.customer);
  if (customer?.phone) {
    const smsSent = await sendSMS(customer.phone, `Your order status has been updated to: ${newStatus}`);
    if (!smsSent) console.warn(`Failed to send SMS to ${customer.phone}`);
  }

  return order;
};
