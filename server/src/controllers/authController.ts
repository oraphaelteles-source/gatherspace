import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { z } from 'zod';

const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(id: string, username: string, isAdmin: boolean) {
  return jwt.sign(
    { id, username, isAdmin },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { username, email, password } = parsed.data;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, is_admin',
      [username, email, hash]
    );
    const user = result.rows[0];
    const token = signToken(user.id, user.username, user.is_admin);
    res.status(201).json({ token, user: { id: user.id, username: user.username } });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Email ou username já cadastrado' });
    } else {
      res.status(500).json({ error: 'Erro interno' });
    }
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { email, password } = parsed.data;
  try {
    const result = await pool.query(
      'SELECT id, username, password_hash, is_admin, avatar_color, avatar_emoji FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }
    const token = signToken(user.id, user.username, user.is_admin);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin,
        avatarColor: user.avatar_color,
        avatarEmoji: user.avatar_emoji,
      },
    });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
}

export async function updateAvatar(req: Request, res: Response) {
  const { avatarColor, avatarEmoji } = req.body;
  const userId = (req as any).user?.id;
  await pool.query(
    'UPDATE users SET avatar_color = $1, avatar_emoji = $2 WHERE id = $3',
    [avatarColor, avatarEmoji, userId]
  );
  res.json({ success: true });
}
