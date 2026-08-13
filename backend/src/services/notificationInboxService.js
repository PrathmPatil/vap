import { Op } from 'sequelize';
import { UserNotification } from '../models/index.js';

const ensureTable = async () => {
  await UserNotification.sync();
};

const serialize = (row) => {
  const plain = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  return {
    ...plain,
    is_read: Boolean(plain.is_read),
  };
};

export async function createNotification({
  userId,
  type = 'info',
  title,
  body = null,
  link = null,
  scanId = null,
  matchCount = null,
  tradeDate = null,
}) {
  await ensureTable();
  const heading = String(title || '').trim();
  if (!heading) throw new Error('Notification title is required');

  const row = await UserNotification.create({
    user_id: userId,
    type: String(type || 'info').slice(0, 40),
    title: heading.slice(0, 180),
    body: body ? String(body) : null,
    link: link ? String(link).slice(0, 255) : null,
    scan_id: scanId || null,
    match_count: matchCount ?? null,
    trade_date: tradeDate || null,
    is_read: false,
    created_at: new Date(),
  });

  return serialize(row);
}

export async function createWelcomeNotification(userId, name) {
  await ensureTable();
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const existing = await UserNotification.findOne({
    where: {
      user_id: userId,
      type: 'welcome',
      created_at: { [Op.gte]: since },
    },
    order: [['id', 'DESC']],
  });
  if (existing) return serialize(existing);

  const displayName = String(name || '').trim() || 'there';
  return createNotification({
    userId,
    type: 'welcome',
    title: 'Welcome back',
    body: `Hi ${displayName}, you are logged in. Open Formulas, Watchlist, or your scan alerts anytime from here.`,
    link: '/company/formula',
  });
}

export async function listNotifications(userId, { unreadOnly = false, limit = 30 } = {}) {
  await ensureTable();
  const where = { user_id: userId };
  if (unreadOnly) where.is_read = false;

  const rows = await UserNotification.findAll({
    where,
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit: Math.min(100, Math.max(1, Number(limit) || 30)),
  });

  const unread_count = await UserNotification.count({
    where: { user_id: userId, is_read: false },
  });

  return {
    data: rows.map(serialize),
    unread_count,
  };
}

export async function unreadCount(userId) {
  await ensureTable();
  const count = await UserNotification.count({
    where: { user_id: userId, is_read: false },
  });
  return { unread_count: count };
}

export async function markNotificationRead(userId, id) {
  await ensureTable();
  const row = await UserNotification.findOne({ where: { id, user_id: userId } });
  if (!row) throw new Error('Notification not found');
  if (!row.is_read) {
    await row.update({ is_read: true, read_at: new Date() });
  }
  return serialize(row);
}

export async function markAllNotificationsRead(userId) {
  await ensureTable();
  const [updated] = await UserNotification.update(
    { is_read: true, read_at: new Date() },
    { where: { user_id: userId, is_read: false } }
  );
  return { updated };
}
