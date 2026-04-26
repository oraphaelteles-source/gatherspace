import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

export async function listRooms(req: Request, res: Response) {
  const result = await pool.query(
    'SELECT r.id, r.name, r.slug, r.description, r.thumbnail, r.max_users FROM rooms r ORDER BY r.created_at ASC'
  );
  res.json(result.rows);
}

export async function getRoom(req: Request, res: Response) {
  const { slug } = req.params;
  const result = await pool.query(
    'SELECT r.*, m.width, m.height, m.tile_size, m.layers, m.objects, m.spawn_x, m.spawn_y FROM rooms r LEFT JOIN maps m ON m.room_id = r.id WHERE r.slug = $1',
    [slug]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Sala não encontrada' });
    return;
  }
  res.json(result.rows[0]);
}

export async function createRoom(req: AuthRequest, res: Response) {
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Nome é obrigatório' });
    return;
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + uuidv4().slice(0, 6);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roomResult = await client.query(
      'INSERT INTO rooms (name, slug, description, owner_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, slug, description || '', req.user!.id]
    );
    const room = roomResult.rows[0];
    const width = 40, height = 30;
    const floor = Array.from({ length: width * height }, (_, i) => {
      const x = i % width, y = Math.floor(i / width);
      return (x === 0 || y === 0 || x === width - 1 || y === height - 1) ? 0 : 1;
    });
    const walls = Array.from({ length: width * height }, (_, i) => {
      const x = i % width, y = Math.floor(i / width);
      return (x === 0 || y === 0 || x === width - 1 || y === height - 1) ? 2 : 0;
    });
    await client.query(
      'INSERT INTO maps (room_id, width, height, tile_size, layers, objects, spawn_x, spawn_y) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [room.id, width, height, 32, JSON.stringify([
        { name: 'floor', data: floor },
        { name: 'walls', data: walls },
        { name: 'decor', data: new Array(width * height).fill(0) },
      ]), '[]', 3, 3]
    );
    await client.query('COMMIT');
    res.status(201).json(room);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function saveMap(req: AuthRequest, res: Response) {
  const { slug } = req.params;
  const { layers, objects, spawnX, spawnY, width, height } = req.body;

  const room = await pool.query('SELECT id FROM rooms WHERE slug = $1', [slug]);
  if (!room.rows[0]) {
    res.status(404).json({ error: 'Sala não encontrada' });
    return;
  }

  await pool.query(
    `UPDATE maps SET layers = $1, objects = $2, spawn_x = $3, spawn_y = $4, width = $5, height = $6, updated_at = NOW()
     WHERE room_id = $7`,
    [JSON.stringify(layers), JSON.stringify(objects), spawnX, spawnY, width, height, room.rows[0].id]
  );
  res.json({ success: true });
}

export async function getMessages(req: Request, res: Response) {
  const { slug } = req.params;
  const room = await pool.query('SELECT id FROM rooms WHERE slug = $1', [slug]);
  if (!room.rows[0]) { res.status(404).json({ error: 'Sala não encontrada' }); return; }
  const messages = await pool.query(
    'SELECT id, username, content, type, created_at FROM messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50',
    [room.rows[0].id]
  );
  res.json(messages.rows.reverse());
}
