import {
  listNotifications,
  unreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationInboxService.js';

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getUserId = (req) => {
  const raw = req.user?.id ?? req.user?.userId ?? req.user?.user_id;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
};

export const listInbox = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const unreadOnly =
    String(req.query.unreadOnly || '').toLowerCase() === 'true' ||
    req.query.unreadOnly === '1';
  const data = await listNotifications(userId, {
    unreadOnly,
    limit: req.query.limit,
  });
  res.json({ success: true, ...data });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const data = await unreadCount(userId);
  res.json({ success: true, ...data });
});

export const readOne = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const data = await markNotificationRead(userId, req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

export const readAll = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const data = await markAllNotificationsRead(userId);
  res.json({ success: true, ...data });
});
