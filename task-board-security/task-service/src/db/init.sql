CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
status VARCHAR(20) DEFAULT 'todo'
       CHECK (status IN ('todo','in_progress','done')),
  priority    VARCHAR(10) DEFAULT 'medium'
              CHECK (priority IN ('low','medium','high')),
  owner_id    VARCHAR(50) NOT NULL,
  assignee_id VARCHAR(50),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ข้อมูลทดสอบ
INSERT INTO tasks (title, description, status, priority, owner_id) VALUES
  ('ออกแบบ Database Schema', 'วาด ERD สำหรับ Task Board', 'DONE', 'high', 'user-001'),
  ('สร้าง Auth Service', 'Implement JWT login/register', 'IN_PROGRESS', 'high', 'user-001'),
  ('เขียน Unit Tests', 'เพิ่ม test coverage ให้ถึง 80%', 'TODO', 'medium', 'user-002'),
  ('ทำ Docker Setup', 'สร้าง docker-compose.yml', 'DONE', 'high', 'user-admin')
ON CONFLICT DO NOTHING;