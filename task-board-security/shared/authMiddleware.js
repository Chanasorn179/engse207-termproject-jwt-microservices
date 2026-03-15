/**
 * authMiddleware.js — JWT Verification Middleware
 * ใช้ร่วมกันระหว่าง task-service และ user-service
 * mount เข้า container ผ่าน docker-compose volumes
 */
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

/**
 * requireAuth — ตรวจสอบ JWT Token
 * ถ้าผ่าน → ใส่ req.user = decoded payload แล้ว next()
 * ถ้าไม่ผ่าน → ส่ง 401 Unauthorized
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "กรุณา Login ก่อน — ไม่พบ Token ใน Authorization header",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token Expired",
        message: "Token หมดอายุ กรุณา Login ใหม่",
      });
    }
    return res.status(401).json({
      error: "Invalid Token",
      message: "Token ไม่ถูกต้อง",
    });
  }
}

/**
 * requireRole — ตรวจสอบ Role
 * @param {...string} roles - roles ที่อนุญาต เช่น 'admin', 'member'
 *
 * ต้องใช้หลังจาก requireAuth เสมอ
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `ต้องการสิทธิ์: ${roles.join(" หรือ ")} (คุณมีสิทธิ์: ${req.user.role})`,
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
