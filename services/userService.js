import UserModel from '../models/userModel.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { generateOTP } from '../utils/otpGenerator.js';
import { sendEmail } from '../utils/sendEmail.js';
import { sendSMS } from '../utils/sendSMS.js';
import redisClient from '../config/redis.js';

export const registerUserService = async ({ name, email, phone, password }, isAdmin = false) => {
  if (!isAdmin) throw new Error('Only admin can create users');

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) throw new Error('User already exists');

  const hashedPassword = await hashPassword(password);

  const user = new UserModel({
    name,
    email,
    phone,
    password: hashedPassword,
    role: 'user',
    isVerified: true,
  });

  await user.save();
  const smsSent = await sendSMS(phone, `Dear ${name}, your user account has been created successfully by admin.`);
  if (!smsSent) throw new Error('Failed to send notification SMS. Please try again.');

  return user;
};

export const deactivateUserById = async (id) => {
  const user = await UserModel.findById(id);
  if (!user) throw new Error('User not found');
  if (user.role !== 'user') throw new Error('Cannot deactivate non-user account');
  if (!user.isActive) throw new Error('This account is already deactive');

  user.isActive = false;
  await user.save();
  return user;
};

export const activateUserById = async (id) => {
  const user = await UserModel.findById(id);
  if (!user) throw new Error('User not found');
  if (user.role !== 'user') throw new Error('Cannot activate non-user account');
  if (user.isActive) throw new Error('This account is already Active!');

  user.isActive = true;
  await user.save();
  return user;
};

export const fetchUsersService = async (limit = 10, cursor = null) => {
  const query = { role: 'user' };
  if (cursor) query._id = { $gt: cursor };

  const users = await UserModel.find(query)
    .select('-password')
    .sort({ _id: -1 })
    .limit(limit);
    const nextCursor = users.length ? users[users.length - 1]._id : null;
  return { users, nextCursor };
};