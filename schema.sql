CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  age INTEGER NOT NULL CHECK(age >= 18),
  gender TEXT NOT NULL,
  want TEXT NOT NULL DEFAULT 'Everyone',
  city TEXT NOT NULL DEFAULT 'Lagos',
  bio TEXT NOT NULL DEFAULT '',
  interests TEXT[] NOT NULL DEFAULT '{}',
  intention TEXT NOT NULL DEFAULT 'Dating',
  occupation TEXT NOT NULL DEFAULT '',
  education TEXT NOT NULL DEFAULT '',
  languages TEXT[] NOT NULL DEFAULT '{English}',
  photo TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS swipes (
  id BIGSERIAL PRIMARY KEY,
  from_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK(direction IN ('like','pass','super')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_user,to_user)
);

CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_a,user_b),
  CHECK(user_a < user_b)
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK(char_length(text) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swipes_from ON swipes(from_user);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user_a,user_b);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id,created_at);
