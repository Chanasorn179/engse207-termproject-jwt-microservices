CREATE TABLE IF NOT EXISTS user_profiles (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  role        VARCHAR(20) DEFAULT 'member',
  avatar_url  VARCHAR(500),
  bio         TEXT,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ข้อมูลทดสอบ (ตรงกับ auth service seed users)
INSERT INTO user_profiles (user_id, name, email, role) VALUES
  ('user-001',   'Alice Smith', 'alice@example.com', 'member'),
  ('user-002',   'Bob Jones',   'bob@example.com',   'member'),
  ('user-admin', 'Admin User',  'admin@example.com', 'admin')
ON CONFLICT DO NOTHING;