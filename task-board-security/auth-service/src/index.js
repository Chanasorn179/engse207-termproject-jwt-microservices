require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { initDB } = require("./db/db");
const { seedUsers } = require("./db/seed"); // ← ✨ v2.0: เพิ่ม seed
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(
  morgan(":method :url :status :response-time ms", {
    stream: { write: (msg) => console.log(msg.trim()) },
  }),
);

app.use("/api/auth", authRoutes);
app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await initDB();
      await seedUsers(); // ← ✨ v2.0: สร้าง test users หลัง table พร้อม
      break;
    } catch (err) {
      console.log(
        `[auth-service] Waiting for DB... (${retries} retries left): ${err.message}`,
      );
      retries--;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  app.listen(PORT, () => {
    console.log(`[auth-service] Running on port ${PORT}`);
    console.log(
      `[auth-service] JWT_EXPIRES: ${process.env.JWT_EXPIRES || "1h"}`,
    );
  });
}

start();
