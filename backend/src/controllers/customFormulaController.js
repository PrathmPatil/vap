import {
  listUserFormulas,
  createUserFormula,
  updateUserFormula,
  deleteUserFormula,
  getUserFormula,
  runUserFormula,
  CUSTOM_FORMULA_ALLOWED_VARS,
  validateExpression,
} from '../services/customFormulaService.js';

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getUserId = (req) => {
  const raw = req.user?.id ?? req.user?.userId ?? req.user?.user_id;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
};

export const listCustomFormulas = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const data = await listUserFormulas(userId);
  res.json({
    success: true,
    data,
    allowed_vars: CUSTOM_FORMULA_ALLOWED_VARS,
  });
});

export const createCustomFormula = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const row = await createUserFormula(userId, req.body || {});
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export const updateCustomFormula = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const row = await updateUserFormula(userId, req.params.id, req.body || {});
    res.json({ success: true, data: row });
  } catch (err) {
    const status = err.message === 'Formula not found' ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
});

export const deleteCustomFormula = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const ok = await deleteUserFormula(userId, req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: 'Formula not found' });
  res.json({ success: true });
});

export const getCustomFormula = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const row = await getUserFormula(userId, req.params.id);
  if (!row) return res.status(404).json({ success: false, message: 'Formula not found' });
  res.json({ success: true, data: row });
});

export const runCustomFormula = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const result = await runUserFormula(userId, req.params.id, {
      ...(req.body || {}),
      ...(req.query || {}),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.message === 'Formula not found' ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
});

export const validateCustomExpression = asyncHandler(async (req, res) => {
  try {
    validateExpression(req.body?.expression || '');
    res.json({ success: true, valid: true, allowed_vars: CUSTOM_FORMULA_ALLOWED_VARS });
  } catch (err) {
    res.status(400).json({
      success: false,
      valid: false,
      message: err.message,
      allowed_vars: CUSTOM_FORMULA_ALLOWED_VARS,
    });
  }
});
