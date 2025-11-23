import { 
  registerUserService,  
  activateUserById, 
  deactivateUserById,
  fetchUsersService
} from '../services/userService.js';
import UserModel from '../models/userModel.js';
import { handleLogin } from '../services/authService.js';

export const registerUserByAdmin = async (req, res) => {
  try {
    const user = await registerUserService({ ...req.body, role: 'user' }, true);
    res.status(201).json({
      message: 'User registered successfully by admin.',
      userId: user._id,
      role: user.role
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor;

    const { users, nextCursor } = await fetchUsersService(limit, cursor);

    res.json({
      success: true,
      users,
      nextCursor
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const activateUser = async (req, res) => {
  try {
    const user = await activateUserById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'User activated successfully',
      user,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const user = await deactivateUserById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      user,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await handleLogin({ email, password });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const verifyAdminOTP = async (req, res) => {
  try {
    const {email, otp} = req.body;
    const result = await handleadminOTP
    
  } catch (error) {
    
  }
}