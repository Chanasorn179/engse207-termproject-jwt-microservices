/**
 * seed.js — สร้าง test users ด้วย bcrypt hash จริง
 * รันอัตโนมัติเมื่อ auth-service เริ่มต้น (ครั้งแรก)
 *
 * ทำไมแยกจาก init.sql?
 * - init.sql ทำได้แค่ INSERT ค่าคงที่ (hardcoded hash)
 * - bcrypt hash ที่ถูกต้องต้องสร้างด้วย bcrypt.hash() เท่านั้น
 * - seed.js generate hash จริงทุกครั้ง → รับประกัน login ได้แน่นอน
 */
const bcrypt = require("bcryptjs");
const { pool } = require("./db");

async function seedUsers() {
  const password = "password123";

  // Generate hash จริงด้วย bcrypt (เหมือนกับตอน login check)
  const hash = await bcrypt.hash(password, 10);

  const testUsers = [
    { user_id: "user-001", email: "alice@example.com", role: "member" },
    { user_id: "user-002", email: "bob@example.com", role: "member" },
    { user_id: "user-admin", email: "admin@example.com", role: "admin" },
  ];

  for (const u of testUsers) {
    await pool.query(
      `INSERT INTO auth_users (user_id, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [u.user_id, u.email, hash, u.role],
    );
  }

  console.log("[auth-db] ✅ Seed users created:");
  console.log(
    "[auth-db]    alice@example.com  (member) | password: password123",
  );
  console.log(
    "[auth-db]    bob@example.com    (member) | password: password123",
  );
  console.log(
    "[auth-db]    admin@example.com  (admin)  | password: password123",
  );
}

module.exports = { seedUsers };
