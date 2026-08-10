import { Op } from 'sequelize';
import { User, UserScan, UserScanAlert } from '../models/index.js';
import { queryFormulaService } from './formulaService.js';
import {
  sendEmailNotification,
  sendWhatsAppNotification,
} from './notificationService.js';

const ensureTables = async () => {
  await UserScan.sync();
  await UserScanAlert.sync();
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const serializeScan = (row) => {
  const plain = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  return {
    ...plain,
    notify_email: Boolean(plain.notify_email),
    notify_whatsapp: Boolean(plain.notify_whatsapp),
    is_active: Boolean(plain.is_active),
  };
};

export async function listUserScans(userId) {
  await ensureTables();
  const rows = await UserScan.findAll({
    where: { user_id: userId },
    order: [['updated_at', 'DESC'], ['id', 'DESC']],
  });
  return rows.map(serializeScan);
}

export async function createUserScan(userId, payload = {}) {
  await ensureTables();
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('Scan name is required');

  const row = await UserScan.create({
    user_id: userId,
    name,
    formula_type: payload.formula_type || 'strong-bullish-candle',
    base_percent: payload.base_percent ?? payload.basePercent ?? 2,
    change_percent_min: payload.change_percent_min ?? payload.changePercentMin ?? null,
    change_percent_max: payload.change_percent_max ?? payload.changePercentMax ?? null,
    change_sort: payload.change_sort || payload.changeSort || 'desc',
    symbol: payload.symbol || null,
    notify_email: toBool(payload.notify_email, false),
    notify_whatsapp: toBool(payload.notify_whatsapp, false),
    alert_email: payload.alert_email || null,
    alert_whatsapp: payload.alert_whatsapp || null,
    is_active: toBool(payload.is_active, true),
    created_at: new Date(),
    updated_at: new Date(),
  });

  return serializeScan(row);
}

export async function updateUserScan(userId, id, payload = {}) {
  await ensureTables();
  const row = await UserScan.findOne({ where: { id, user_id: userId } });
  if (!row) throw new Error('Scan not found');

  const next = {
    name: payload.name != null ? String(payload.name).trim() : row.name,
    formula_type: payload.formula_type || row.formula_type,
    base_percent: payload.base_percent ?? payload.basePercent ?? row.base_percent,
    change_percent_min:
      payload.change_percent_min ?? payload.changePercentMin ?? row.change_percent_min,
    change_percent_max:
      payload.change_percent_max ?? payload.changePercentMax ?? row.change_percent_max,
    change_sort: payload.change_sort || payload.changeSort || row.change_sort,
    symbol: payload.symbol !== undefined ? payload.symbol || null : row.symbol,
    notify_email:
      payload.notify_email !== undefined ? toBool(payload.notify_email) : row.notify_email,
    notify_whatsapp:
      payload.notify_whatsapp !== undefined
        ? toBool(payload.notify_whatsapp)
        : row.notify_whatsapp,
    alert_email:
      payload.alert_email !== undefined ? payload.alert_email || null : row.alert_email,
    alert_whatsapp:
      payload.alert_whatsapp !== undefined
        ? payload.alert_whatsapp || null
        : row.alert_whatsapp,
    is_active: payload.is_active !== undefined ? toBool(payload.is_active) : row.is_active,
    updated_at: new Date(),
  };

  if (!next.name) throw new Error('Scan name is required');
  await row.update(next);
  return serializeScan(row);
}

export async function deleteUserScan(userId, id) {
  await ensureTables();
  const deleted = await UserScan.destroy({ where: { id, user_id: userId } });
  if (!deleted) throw new Error('Scan not found');
  return true;
}

const runScanQuery = async (scan) =>
  queryFormulaService(scan.formula_type || 'strong-bullish-candle', {
    currentPage: 1,
    itemsPerPage: 50,
    symbol: scan.symbol || '',
    targetDate: null,
    basePercent: scan.base_percent ?? 2,
    changePercentMin: scan.change_percent_min,
    changePercentMax: scan.change_percent_max,
    changeSort: scan.change_sort || 'desc',
  });

const buildAlertMessage = (scan, result) => {
  const count = result.totalItems || 0;
  const date = result.trade_date || result.latest_date || 'latest session';
  return `${scan.name}: ${count} match${count === 1 ? '' : 'es'} for ${scan.formula_type} on ${date}.`;
};

const notifyScan = async (scan, user, result) => {
  const message = buildAlertMessage(scan, result);
  const deliveries = [];
  const emailTo = scan.alert_email || user?.email;
  const whatsappTo = scan.alert_whatsapp || user?.whatsappNumber || user?.phoneNumber;

  if (scan.notify_email) {
    const emailResult = await sendEmailNotification({
      to: emailTo,
      subject: `TrendTraders alert: ${scan.name}`,
      text: message,
    });
    deliveries.push(emailResult);
    await UserScanAlert.create({
      scan_id: scan.id,
      user_id: scan.user_id,
      channel: 'email',
      status: emailResult.status,
      recipient: emailTo || null,
      message,
      match_count: result.totalItems || 0,
      trade_date: result.trade_date || result.latest_date || null,
      error_message: emailResult.message || null,
      created_at: new Date(),
    });
  }

  if (scan.notify_whatsapp) {
    const waResult = await sendWhatsAppNotification({
      to: whatsappTo,
      message,
    });
    deliveries.push(waResult);
    await UserScanAlert.create({
      scan_id: scan.id,
      user_id: scan.user_id,
      channel: 'whatsapp',
      status: waResult.status,
      recipient: whatsappTo || null,
      message,
      match_count: result.totalItems || 0,
      trade_date: result.trade_date || result.latest_date || null,
      error_message: waResult.message || null,
      created_at: new Date(),
    });
  }

  await UserScan.update(
    {
      last_match_count: result.totalItems || 0,
      last_trade_date: result.trade_date || result.latest_date || null,
      last_notified_at: new Date(),
      updated_at: new Date(),
    },
    { where: { id: scan.id } }
  );

  return { message, deliveries, match_count: result.totalItems || 0 };
};

export async function runUserScan(userId, id, { notify = false } = {}) {
  await ensureTables();
  const scan = await UserScan.findOne({ where: { id, user_id: userId } });
  if (!scan) throw new Error('Scan not found');

  const result = await runScanQuery(scan);
  const user = await User.findByPk(userId);
  let notification = null;

  if (notify && (scan.notify_email || scan.notify_whatsapp)) {
    notification = await notifyScan(scan, user, result);
  } else {
    await scan.update({
      last_match_count: result.totalItems || 0,
      last_trade_date: result.trade_date || result.latest_date || null,
      updated_at: new Date(),
    });
  }

  return {
    scan: serializeScan(await scan.reload()),
    result,
    notification,
  };
}

export async function dispatchActiveScanAlerts() {
  await ensureTables();
  const scans = await UserScan.findAll({
    where: {
      is_active: true,
      [Op.or]: [{ notify_email: true }, { notify_whatsapp: true }],
    },
  });

  const summary = [];
  for (const scan of scans) {
    try {
      const result = await runScanQuery(scan);
      if (!result?.success || !(result.totalItems > 0)) {
        summary.push({ scan_id: scan.id, skipped: true, match_count: result.totalItems || 0 });
        continue;
      }
      const user = await User.findByPk(scan.user_id);
      const notification = await notifyScan(scan, user, result);
      summary.push({ scan_id: scan.id, match_count: notification.match_count, deliveries: notification.deliveries });
    } catch (error) {
      summary.push({ scan_id: scan.id, error: error.message });
    }
  }

  return summary;
}
