import {
  listUserScans,
  createUserScan,
  updateUserScan,
  deleteUserScan,
  runUserScan,
} from '../services/userScanService.js';

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getUserId = (req) => {
  const raw = req.user?.id ?? req.user?.userId ?? req.user?.user_id;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
};

export const listScans = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const data = await listUserScans(userId);
  res.json({ success: true, data });
});

export const createScan = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const data = await createUserScan(userId, req.body || {});
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export const updateScan = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const data = await updateUserScan(userId, req.params.id, req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export const deleteScan = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    await deleteUserScan(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export const runScan = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const notify = req.body?.notify !== false;
    const data = await runUserScan(userId, req.params.id, { notify });
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
