CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  credits INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creators (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  rate_per_minute INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS call_sessions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES users(id),
  creator_id INTEGER REFERENCES creators(id),
  active BOOLEAN DEFAULT true,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);
