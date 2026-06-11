require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

function createToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/api/status", (req, res) => {
  res.json({ status: "EmberCalls online" });
});

app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password_hash, credits) VALUES ($1, $2, 0) RETURNING id, email, credits",
      [email, hash]
    );

    const user = result.rows[0];

    res.json({
      success: true,
      token: createToken(user.id),
      user
    });
  } catch (err) {
    res.status(500).json({ error: "Register failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Wrong email or password" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Wrong email or password" });
    }

    res.json({
      success: true,
      token: createToken(user.id),
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits
      }
    });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/me", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, email, credits FROM users WHERE id = $1",
    [req.userId]
  );

  res.json(result.rows[0]);
});

app.post("/api/creator", auth, async (req, res) => {
  try {
    const { displayName, bio, ratePerMinute } = req.body;

    const result = await pool.query(
      "INSERT INTO creators (user_id, display_name, bio, rate_per_minute) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.userId, displayName, bio || "", ratePerMinute]
    );

    res.json({ success: true, creator: result.rows[0] });
  } catch {
    res.status(500).json({ error: "Could not create creator profile" });
  }
});

app.get("/api/creators", async (req, res) => {
  const result = await pool.query(
    "SELECT creators.*, users.email FROM creators JOIN users ON users.id = creators.user_id ORDER BY creators.id DESC"
  );

  res.json(result.rows);
});

app.post("/api/start-call", auth, async (req, res) => {
  try {
    const { creatorId } = req.body;

    const creatorRes = await pool.query(
      "SELECT * FROM creators WHERE id = $1",
      [creatorId]
    );

    if (creatorRes.rows.length === 0) {
      return res.status(404).json({ error: "Creator not found" });
    }

    const sessionRes = await pool.query(
      "INSERT INTO call_sessions (customer_id, creator_id) VALUES ($1, $2) RETURNING *",
      [req.userId, creatorId]
    );

    const session = sessionRes.rows[0];

    res.json({
      success: true,
      session,
      roomId: `room-${session.id}`,
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
  } catch {
    res.status(500).json({ error: "Failed to start call" });
  }
});

app.post("/api/end-call", auth, async (req, res) => {
  const { sessionId } = req.body;

  await pool.query(
    "UPDATE call_sessions SET active=false, ended_at=NOW() WHERE id=$1",
    [sessionId]
  );

  res.json({ success: true });
});

io.on("connection", socket => {
  socket.on("join-room", roomId => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined");
  });

  socket.on("offer", data => socket.to(data.roomId).emit("offer", data.offer));
  socket.on("answer", data => socket.to(data.roomId).emit("answer", data.answer));
  socket.on("ice-candidate", data => socket.to(data.roomId).emit("ice-candidate", data.candidate));
});

server.listen(PORT, () => {
  console.log(`EmberCalls running on http://localhost:${PORT}`);
});
