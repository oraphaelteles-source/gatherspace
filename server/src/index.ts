import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import routes from './routes';
import { setupGameSocket } from './socket/gameSocket';
import { pool } from './config/database';

async function waitForDatabase(retries = 20, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database connected');
      return;
    } catch (err: any) {
      console.log(`⏳ Waiting for database... (${i}/${retries}) - ${err.message}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('Could not connect to database after retries');
}

async function main() {
  await waitForDatabase();

  const { schema, seed } = await import('./config/migrate-inline');
  const client = await pool.connect();
  try {
    await client.query(schema);
    await seed(client);
    console.log('✅ Migrations done');
  } finally {
    client.release();
  }

  const app = express();
  const httpServer = createServer(app);

  const CLIENT_URL = process.env.CLIENT_URL || '*';

  const io = new Server(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  app.use(cors({ origin: CLIENT_URL, credentials: true }));
  app.use(express.json());
  app.use('/api', routes);

  setupGameSocket(io);

  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
