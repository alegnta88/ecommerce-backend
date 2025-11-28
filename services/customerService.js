import CustomerModel from '../models/customerModel.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateOTP } from '../utils/otpGenerator.js';
import { sendSMS } from '../utils/sendSMS.js';
import { generateToken } from '../utils/jwt.js';
import redisClient from '../config/redis.js';

export const registerCustomerService = async ({ name, email, phone, password }) => {
  const existingCustomer = await CustomerModel.findOne({ email });
  if (existingCustomer) throw new Error('Customer already exists');

  const hashedPassword = await hashPassword(password);
  const otp = generateOTP(6);

  const customer = new CustomerModel({
    name,
    email,
    phone,
    password: hashedPassword,
    role: 'customer',
    isVerified: false,
    twoFactorEnabled: false,
  });

  console.log('Registering customer with:', name, email, phone, hashedPassword);

  await customer.save();

  await redisClient.setEx(`otp:registration:${customer._id}`, 300, otp);

  const smsSent = await sendSMS(phone, `Dear ${name}, your registration OTP is ${otp}`);
  if (!smsSent) {
    await redisClient.del(`otp:registration:${customer._id}`);
    throw new Error('Failed to send OTP. Please try again.');
  }

  return customer;
};

export const verifyCustomerOTPService = async ({ email, otp }) => {
  const customer = await CustomerModel.findOne({ email });
  if (!customer) throw new Error('Customer not found');
  if (customer.isVerified) throw new Error('Customer already verified');

  const storedOtp = await redisClient.get(`otp:registration:${customer._id}`);
  if (!storedOtp) throw new Error('OTP expired or not found');
  if (storedOtp !== otp) throw new Error('Invalid OTP');

  customer.isVerified = true;
  await customer.save();

  await redisClient.del(`otp:registration:${customer._id}`);

  const token = generateToken({ id: customer._id, email: customer.email, role: customer.role });

  await sendSMS(customer.phone, `Dear ${customer.name}, your account is verified successfully.`);
  console.log(`SMS sent to ${customer.phone}: Your account is verified successfully.`);

  return { customer, token };
};

export const loginCustomerService = async ({ email, password }) => {
  const customer = await CustomerModel.findOne({ email });
  if (!customer) throw new Error('Customer not found');

  if (!customer.isVerified) throw new Error('Please verify your account first');

  const isMatch = await comparePassword(password, customer.password);
  if (!isMatch) throw new Error('Invalid credentials');

  if (!customer.isActive) throw new Error('Account is deactivated');

  if (customer.twoFactorEnabled) {
    const otp = generateOTP(6);

    await redisClient.setEx(`otp:2fa-login:${customer.email}`, 300, otp);

    await sendSMS(customer.phone, `Your login OTP is: ${otp}`);

    return { message: '2FA enabled. Verify OTP to complete login.' };
  }

  const token = generateToken({
    id: customer._id,
    email: customer.email,
    role: customer.role,
  });

  return {
    customer: {
      id: customer._id,
      name: customer.name,
      email: customer.email,
    },
    token,
  };
};

export const verify2FALoginService = async ({ email, otp }) => {
  const customer = await CustomerModel.findOne({ email });
  if (!customer) throw new Error('Customer not found');

  const storedOtp = await redisClient.get(`otp:2fa-login:${email}`);
  if (!storedOtp) throw new Error('OTP expired or not found');

  if (storedOtp !== otp) throw new Error('Invalid OTP');

  await redisClient.del(`otp:2fa-login:${email}`);

  const token = generateToken({
    id: customer._id,
    email: customer.email,
    role: customer.role,
  });

  await sendSMS(customer.phone, `Dear ${customer.name}, you have logged in successfully.`);

  return { customer, token };
};

export const enable2FAService = async (customerId) => {
  const customer = await CustomerModel.findById(customerId);
  if (!customer) throw new Error('Customer not found');
  if (customer.twoFactorEnabled) throw new Error('2FA is already enabled.');

  const otp = generateOTP(6);

  await redisClient.setEx(`otp:2fa-enable:${customerId}`, 300, otp);

  await sendSMS(customer.phone, `Your 2FA activation code is ${otp}`);

  return { message: 'OTP sent to your phone for 2FA activation.' };
};

export const verifyEnable2FAService = async ({ customerId, otp }) => {
  const customer = await CustomerModel.findById(customerId);
  if (!customer) throw new Error('Customer not found');

  const storedOtp = await redisClient.get(`otp:2fa-enable:${customerId}`);
  if (!storedOtp) throw new Error('OTP expired or not found');
  if (storedOtp !== otp) throw new Error('Invalid OTP');

  customer.twoFactorEnabled = true;
  await customer.save();

  await redisClient.del(`otp:2fa-enable:${customerId}`);

  return { message: '2FA enabled successfully.' };
};

export const disable2FAService = async (customerId) => {
  const customer = await CustomerModel.findById(customerId);
  if (!customer) throw new Error('Customer not found');

  if (!customer.twoFactorEnabled) {
    throw new Error('2FA is already disabled.');
  }

  customer.twoFactorEnabled = false;
  await customer.save();

  await sendSMS(
    customer.phone,
    `Dear ${customer.name}, two-factor authentication has been disabled for your account.`
  );

  return { message: '2FA has been disabled successfully.' };
};

export const deactivateCustomerService = async (id) => {
  const customer = await CustomerModel.findById(id);
  if (!customer) throw new Error('Customer not found');
  if (!customer.isActive) throw new Error('Customer already deactivated');

  customer.isActive = false;
  await customer.save();

  return customer;
};

export const activateCustomerService = async (id) => {
  const customer = await CustomerModel.findById(id);
  if (!customer) throw new Error('Customer not found');
  if (customer.isActive) throw new Error('Customer already active');

  customer.isActive = true;
  await customer.save();

  return customer;
};

export const getAllCustomersService = async (limit = 10, cursor) => {
  const query = cursor ? { _id: { $gt: cursor } } : {};
  const customers = await CustomerModel.find(query)
    .select('-password')
    .sort({ _id: -1 })
    .limit(limit);

  const nextCursor = customers.length ? customers[customers.length - 1]._id : null;
  return { customers, nextCursor };
};

export const requestPasswordResetService = async (email) => {
  const customer = await CustomerModel.findOne({ email });
  if (!customer) throw new Error('Customer not found');
  if (!customer.isActive) throw new Error('Your account is deactivated. Contact support.');

  const otp = generateOTP(6);

  await redisClient.setEx(`otp:password-reset:${email}`, 600, otp);

  const smsSent = await sendSMS(
    customer.phone,
    `Dear ${customer.name}, your password reset code is ${otp}`
  );
  if (!smsSent) {
    await redisClient.del(`otp:password-reset:${email}`);
    throw new Error('Failed to send reset code. Please try again.');
  }

  return { message: 'Password reset OTP sent successfully.' };
};

export const resetPasswordService = async ({ email, otp, newPassword }) => {
  const customer = await CustomerModel.findOne({ email });
  if (!customer) throw new Error('Customer not found');

  const storedOtp = await redisClient.get(`otp:password-reset:${email}`);
  if (!storedOtp) throw new Error('OTP expired or not found');
  if (storedOtp !== otp) throw new Error('Invalid OTP');

  customer.password = await hashPassword(newPassword);
  await customer.save();

  await redisClient.del(`otp:password-reset:${email}`);

  const smsSent = await sendSMS(
    customer.phone,
    `Dear ${customer.name}, your password has been reset successfully.`
  );
  if (!smsSent) throw new Error('Password reset, but failed to send confirmation SMS.');

  return { message: 'Password reset successful.' };
};