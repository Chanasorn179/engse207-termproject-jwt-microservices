-- สร้าง table สำหรับ users (auth data เท่านั้น)
-- ⚠️ Version 2.0: ไม่มี INSERT ที่นี่แล้ว!
-- ข้อมูลทดสอบสร้างโดย seed.js เพื่อให้ bcrypt hash ถูกต้อง 100%
CREATE TABLE IF NOT EXISTS auth_users (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  DEFAULT 'member',
  created_at    TIMESTAMP    DEFAULT NOW(),
  last_login    TIMESTAMP
);