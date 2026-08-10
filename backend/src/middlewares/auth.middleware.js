import HttpStatus from 'http-status-codes';
import jwt from 'jsonwebtoken';

/**
 * Middleware to authenticate if user has a valid Authorization token
 * Authorization: Bearer <token>
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export const userAuth = async (req, res, next) => {
  try {
    let bearerToken = req.header('Authorization');
    if (!bearerToken)
      throw {
        code: HttpStatus.BAD_REQUEST,
        message: 'Authorization token is required'
      };
    bearerToken = bearerToken.split(' ')[1];

    const { user } = await jwt.verify(bearerToken, 'your-secret-key');
    res.locals.user = user;
    res.locals.token = bearerToken;
    next();
  } catch (error) {
    next(error);
  }
};


export const authenticate = (req, res, next) => {

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const requireMaster = (req, res, next) => {
  const role = String(req.user?.role || "").trim().toLowerCase();

  if (role !== "master" && role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Master or admin access required",
    });
  }

  next();
};

/**
 * Allow master JWT OR shared internal API key (Python → Node service calls).
 * Header: X-Internal-Api-Key: <INTERNAL_API_KEY>
 */
export const authenticateMasterOrInternal = (req, res, next) => {
  const configuredKey = process.env.INTERNAL_API_KEY?.trim();
  const headerKey = req.headers["x-internal-api-key"]?.toString().trim();

  if (configuredKey && headerKey && headerKey === configuredKey) {
    req.user = {
      id: 0,
      email: "internal@vap.service",
      role: "master",
      internal: true,
    };
    return next();
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
      hint: "Use master JWT or X-Internal-Api-Key",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    const role = String(decoded?.role || "").trim().toLowerCase();
    if (role !== "master" && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Master access required",
      });
    }
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

