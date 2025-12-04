import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';

const adminAuth = asyncHandler((req, res, next) => {
  const token =
    req.headers.authorization?.split(" ")[1] || req.headers.token;

  if (!token) {
    res.status(401);
    throw new Error("Not authorized. Login again.");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.role !== "admin") {
    res.status(403);
    throw new Error("Access denied. Admin only.");
  }

  req.user = decoded;
  next();
});

export default adminAuth;