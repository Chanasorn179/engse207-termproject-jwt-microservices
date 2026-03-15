const express = require("express");
const { pool } = require("../db/db");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

const VALID_PRIORITIES = ["low", "medium", "high"];
const VALID_STATUSES = ["todo", "in_progress", "done"];

// normalize ค่าจาก frontend ที่อาจส่งมาหลายรูปแบบ
// เช่น "In Progress" → "in_progress", "HIGH" → "high"
function normalizeStatus(val) {
  if (!val) return val;
  const map = {
    todo: "todo",
    "in progress": "in_progress",
    in_progress: "in_progress",
    inprogress: "in_progress",
    done: "done",
  };
  return map[val.toLowerCase().trim()] ?? val.toLowerCase().trim();
}

function normalizePriority(val) {
  if (!val) return val;
  return val.toLowerCase().trim();
}

function isValidId(val) {
  const n = parseInt(val, 10);
  return !isNaN(n) && n > 0 && String(n) === String(val).trim();
}

// GET /api/tasks/health
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "task-service" });
});

// GET /api/tasks/stats — all authenticated users (กรอง data ตาม role)
router.get("/stats", requireAuth, async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const userId = req.user.sub;

  try {
    const [byStatus, byPriority, topAssignees, recentCount] = await Promise.all(
      [
        pool.query(
          `
        SELECT status, COUNT(*)::int AS count
        FROM tasks
        ${!isAdmin ? "WHERE owner_id = $1 OR assignee_id = $1" : ""}
        GROUP BY status ORDER BY status
      `,
          !isAdmin ? [userId] : [],
        ),

        pool.query(
          `
        SELECT priority, COUNT(*)::int AS count
        FROM tasks
        ${!isAdmin ? "WHERE owner_id = $1 OR assignee_id = $1" : ""}
        GROUP BY priority ORDER BY priority
      `,
          !isAdmin ? [userId] : [],
        ),

        isAdmin
          ? pool.query(`
            SELECT assignee_id, COUNT(*)::int AS task_count
            FROM tasks
            WHERE assignee_id IS NOT NULL
            GROUP BY assignee_id
            ORDER BY task_count DESC
            LIMIT 5
          `)
          : Promise.resolve({ rows: null }),

        pool.query(
          `
        SELECT COUNT(*)::int AS count
        FROM tasks
        WHERE created_at >= NOW() - INTERVAL '7 days'
        ${!isAdmin ? "AND (owner_id = $1 OR assignee_id = $1)" : ""}
      `,
          !isAdmin ? [userId] : [],
        ),
      ],
    );

    res.json({
      by_status: byStatus.rows,
      by_priority: byPriority.rows,
      top_assignees: topAssignees.rows,
      created_last_7_days: recentCount.rows[0].count,
    });
  } catch (err) {
    console.error("[TASK] GET /stats error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/tasks
router.get("/", requireAuth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === "admin") {
      query = "SELECT * FROM tasks ORDER BY created_at DESC";
      params = [];
    } else {
      query =
        "SELECT * FROM tasks WHERE owner_id = $1 OR assignee_id = $1 ORDER BY created_at DESC";
      params = [req.user.sub];
    }
    const result = await pool.query(query, params);
    res.json({ tasks: result.rows, total: result.rowCount });
  } catch (err) {
    console.error("[TASK] GET / error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/tasks
router.post("/", requireAuth, async (req, res) => {
  const { title, description, assignee_id } = req.body;
  const priority = normalizePriority(req.body.priority);

  if (!title || title.trim() === "") {
    return res.status(400).json({ error: "Title ห้ามว่าง" });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res
      .status(400)
      .json({ error: `Priority ต้องเป็น: ${VALID_PRIORITIES.join(", ")}` });
  }
  if (
    assignee_id !== undefined &&
    assignee_id !== null &&
    !isValidId(assignee_id)
  ) {
    return res.status(400).json({ error: "assignee_id ไม่ถูกต้อง" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, priority, owner_id, assignee_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        title.trim(),
        description || "",
        priority || "medium",
        req.user.sub,
        assignee_id || null,
      ],
    );
    console.log(`[TASK] Created by ${req.user.sub}: "${title.trim()}"`);
    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    console.error("[TASK] POST / error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/tasks/:id
router.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Task ID ไม่ถูกต้อง" });
  }

  const { title, description, assignee_id } = req.body;
  const status = normalizeStatus(req.body.status);
  const priority = normalizePriority(req.body.priority);

  if (
    priority !== undefined &&
    priority !== null &&
    !VALID_PRIORITIES.includes(priority)
  ) {
    return res
      .status(400)
      .json({ error: `Priority ต้องเป็น: ${VALID_PRIORITIES.join(", ")}` });
  }
  if (
    status !== undefined &&
    status !== null &&
    !VALID_STATUSES.includes(status)
  ) {
    return res
      .status(400)
      .json({ error: `Status ต้องเป็น: ${VALID_STATUSES.join(", ")}` });
  }
  if (
    assignee_id !== undefined &&
    assignee_id !== null &&
    !isValidId(assignee_id)
  ) {
    return res.status(400).json({ error: "assignee_id ไม่ถูกต้อง" });
  }

  try {
    const checkResult = await pool.query("SELECT * FROM tasks WHERE id = $1", [
      id,
    ]);
    if (!checkResult.rows[0]) {
      return res.status(404).json({ error: "ไม่พบ Task" });
    }
    const task = checkResult.rows[0];
    if (req.user.role !== "admin" && task.owner_id !== req.user.sub) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์แก้ไข Task นี้" });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title       = $1,
           description = $2,
           status      = $3,
           priority    = $4,
           assignee_id = $5,
           updated_at  = NOW()
       WHERE id = $6 RETURNING *`,
      [
        title ?? task.title,
        description ?? task.description,
        status ?? task.status,
        priority ?? task.priority,
        assignee_id !== undefined ? assignee_id : task.assignee_id,
        id,
      ],
    );
    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error("[TASK] PUT /:id error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({ error: "Task ID ไม่ถูกต้อง" });
  }

  try {
    const checkResult = await pool.query("SELECT * FROM tasks WHERE id = $1", [
      id,
    ]);
    if (!checkResult.rows[0]) {
      return res.status(404).json({ error: "ไม่พบ Task" });
    }
    if (
      req.user.role !== "admin" &&
      checkResult.rows[0].owner_id !== req.user.sub
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    console.log(`[TASK] Deleted task ${id} by ${req.user.sub}`);
    res.json({ message: "ลบ Task สำเร็จ" });
  } catch (err) {
    console.error("[TASK] DELETE /:id error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
