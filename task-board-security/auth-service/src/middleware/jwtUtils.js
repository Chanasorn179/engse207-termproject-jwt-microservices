const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "1h";

/**
 * สร้าง JWT Token
 * @param {object} payload - ข้อมูลที่จะฝังใน token
 * @returns {string} JWT token string
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * ตรวจสอบ JWT Token
 * @param {string} token
 * @returns {object} decoded payload หรือ throw error
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { generateToken, verifyToken };
