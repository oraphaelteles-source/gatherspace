import { Router } from 'express';
import { register, login, updateAvatar } from '../controllers/authController';
import { listRooms, getRoom, createRoom, saveMap, getMessages } from '../controllers/roomController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.patch('/auth/avatar', authMiddleware, updateAvatar);

router.get('/rooms', listRooms);
router.get('/rooms/:slug', getRoom);
router.post('/rooms', authMiddleware, createRoom);
router.put('/rooms/:slug/map', authMiddleware, saveMap);
router.get('/rooms/:slug/messages', getMessages);

export default router;
