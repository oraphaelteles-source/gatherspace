import { PoolClient } from 'pg';

export const schema = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_color VARCHAR(7) DEFAULT '#4F46E5',
  avatar_emoji VARCHAR(10) DEFAULT '😊',
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  thumbnail TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  max_users INTEGER DEFAULT 50,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  width INTEGER NOT NULL DEFAULT 30,
  height INTEGER NOT NULL DEFAULT 20,
  tile_size INTEGER NOT NULL DEFAULT 32,
  layers JSONB NOT NULL DEFAULT '[]',
  objects JSONB NOT NULL DEFAULT '[]',
  spawn_x INTEGER DEFAULT 5,
  spawn_y INTEGER DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'global',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_slug ON rooms(slug);
`;

export async function seed(client: PoolClient) {
  const existing = await client.query("SELECT id FROM rooms WHERE slug = 'escritorio-principal'");
  if (existing.rows.length > 0) return;

  const width = 40, height = 30;
  const floor = Array.from({ length: width * height }, (_, i) => {
    const x = i % width, y = Math.floor(i / width);
    return (x === 0 || y === 0 || x === width - 1 || y === height - 1) ? 0 : 1;
  });
  const walls = Array.from({ length: width * height }, (_, i) => {
    const x = i % width, y = Math.floor(i / width);
    return (x === 0 || y === 0 || x === width - 1 || y === height - 1) ? 2 : 0;
  });

  const roomResult = await client.query(`
    INSERT INTO rooms (name, slug, description)
    VALUES ('Escritório Principal', 'escritorio-principal', 'Sala principal da empresa')
    RETURNING id
  `);

  await client.query(`
    INSERT INTO maps (room_id, width, height, tile_size, layers, objects, spawn_x, spawn_y)
    VALUES ($1, $2, $3, 32, $4, $5, 3, 3)
  `, [
    roomResult.rows[0].id, width, height,
    JSON.stringify([
      { name: 'floor', data: floor },
      { name: 'walls', data: walls },
      { name: 'decor', data: new Array(width * height).fill(0) },
    ]),
    JSON.stringify([
      { id: 'obj_1', type: 'desk', x: 5, y: 5, width: 2, height: 1, label: 'Mesa 1', interactive: false },
      { id: 'obj_2', type: 'desk', x: 8, y: 5, width: 2, height: 1, label: 'Mesa 2', interactive: false },
      { id: 'obj_3', type: 'meeting_table', x: 5, y: 12, width: 4, height: 3, label: 'Sala de Reunião', interactive: true },
      { id: 'obj_4', type: 'whiteboard', x: 20, y: 5, width: 3, height: 2, label: 'Quadro Branco', interactive: true },
      { id: 'obj_5', type: 'tv', x: 20, y: 10, width: 2, height: 1, label: 'TV', interactive: true },
      { id: 'obj_6', type: 'plant', x: 3, y: 3, width: 1, height: 1, label: '', interactive: false },
    ]),
  ]);
}
