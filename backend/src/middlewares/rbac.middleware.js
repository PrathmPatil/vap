import HttpStatus from 'http-status-codes';
import jwt from 'jsonwebtoken';

/**
 * Middleware to check if user has required role
 * @param {string|string[]} requiredRoles - Role or array of roles required
 * @returns {Function} Express middleware
 */
export const checkRole = (requiredRoles) => {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: "Authorization token is required"
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const userRole = decoded.user?.role || decoded.role;

      if (!userRole) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: "User role not found in token"
        });
      }

      const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`
        });
      }

      req.user = decoded.user || decoded;
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error("❌ RBAC Middleware Error:", error.message);
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Invalid or expired token"
      });
    }
  };
};

/**
 * Middleware to check if user is a master
 */
export const requireMaster = checkRole('master');

/**
 * Middleware to check if user is master or administrative
 */
export const requireMasterOrAdmin = checkRole(['master', 'administrative']);
