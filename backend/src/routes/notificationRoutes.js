import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  listInbox,
  getUnreadCount,
  readOne,
  readAll,
} from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', authenticate, listInbox);
router.get('/unread-count', authenticate, getUnreadCount);
router.patch('/:id/read', authenticate, readOne);
router.post('/read-all', authenticate, readAll);

export default router;
