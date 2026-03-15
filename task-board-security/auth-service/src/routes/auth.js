const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db/db");
const { generateToken, verifyToken } = require("../middleware/jwtUtils");

const router = express.Router();

// ─────────────────────────────────────────────
// POST /api/auth/register — สมัครสมาชิกใหม่
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      error: "กรุณากรอก email, password และ name",
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      error: "Password ต้องมีอย่างน้อย 6 ตัวอักษร",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = "user-" + Date.now();

    const result = await pool.query(
      `INSERT INTO auth_users (user_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'member')
       RETURNING id, user_id, email, role`,
      [userId, email.toLowerCase(), passwordHash],
    );

    const user = result.rows[0];
    const token = generateToken({
      sub: user.user_id,
      email: user.email,
      role: user.role,
      name,
    });

    console.log(`[AUTH] Register success: ${email}`);
    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      token,
      user: { id: user.user_id, email: user.email, role: user.role, name },
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email นี้ถูกใช้แล้ว" });
    }
    console.error("[AUTH] Register error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login — เข้าสู่ระบบ
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "กรุณากรอก email และ password" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM auth_users WHERE email = $1",
      [email.toLowerCase()],
    );
    const user = result.rows[0];

    // ⚠️ Timing Attack prevention: ใช้เวลาเท่ากันไม่ว่า user จะมีหรือไม่
    const dummyHash =
      "$2b$10$invalidhashpadding000000000000000000000000000000000000";
    const passwordHash = user ? user.password_hash : dummyHash;
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isValid) {
      console.log(`[AUTH] Login failed: ${email}`);
      return res.status(401).json({ error: "Email หรือ Password ไม่ถูกต้อง" });
    }

    await pool.query("UPDATE auth_users SET last_login = NOW() WHERE id = $1", [
      user.id,
    ]);

    const token = generateToken({
      sub: user.user_id,
      email: user.email,
      role: user.role,
    });

    console.log(`[AUTH] Login success: ${email} (role: ${user.role})`);
    res.json({
      message: "Login สำเร็จ",
      token,
      user: { id: user.user_id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[AUTH] Login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/verify — ตรวจสอบ token (internal)
// ─────────────────────────────────────────────
router.get("/verify", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ valid: false, error: "No token provided" });
  }

  try {
    const decoded = verifyToken(token);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

// GET /api/auth/health
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "auth-service", time: new Date() });
});

module.exports = router;
