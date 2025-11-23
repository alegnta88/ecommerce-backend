import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
  registerCustomer, 
  verifyOTP, 
  loginCustomer, 
  verify2FALogin,       
  enable2FA,            
  verifyEnable2FA,      
  getAllCustomers, 
  deactivateCustomer, 
  activateCustomer,
  requestPasswordReset,
  resetPassword,
  disable2FA
} from '../controllers/customerController.js';
import adminAuth from '../middleware/adminAuth.js';
import customerAuth from '../middleware/customerAuth.js';
import adminOrUserAuth from '../middleware/adminOrUserAuth.js';

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, 
  max: 8, 
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

const customerRouter = express.Router();
customerRouter.post('/register', registerCustomer);
customerRouter.post('/verify', verifyOTP);


customerRouter.post('/login', loginLimiter, loginCustomer);  
customerRouter.post('/login/verify', verify2FALogin);       

customerRouter.post('/2fa/enable', customerAuth, enable2FA);          
customerRouter.post('/2fa/verify', customerAuth, verifyEnable2FA);

customerRouter.post('/2fa/disable', customerAuth, disable2FA);          

customerRouter.get('/', adminOrUserAuth, getAllCustomers);
customerRouter.put('/:id/deactivate', adminAuth, deactivateCustomer);
customerRouter.put('/:id/activate', adminAuth, activateCustomer);

customerRouter.post('/password/forgot', requestPasswordReset);
customerRouter.post('/password/reset', resetPassword);

export default customerRouter;