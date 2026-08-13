import { UserFormula } from '../models/index.js';
import {
  validateExpression,
  evaluateExpression,
  expressionPasses,
  CUSTOM_FORMULA_ALLOWED_VARS,
} from '../utils/expressionEngine.js';
import { buildIndicatorContexts, getLatestPrDate } from './technicalScreenerService.js';

const asyncEnsure = async () => {
  try {
    await UserFormula.sync();
  } catch {
    // ignore
  }
};

function slugify(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export async function listUserFormulas(userId) {
  await asyncEnsure();
  const rows = await UserFormula.findAll({
    where: { user_id: userId },
    order: [['updated_at', 'DESC']],
  });
  return rows.map((row) => row.get({ plain: true }));
}

export async function createUserFormula(userId, payload) {
  await asyncEnsure();
  const name = String(payload.name || '').trim();
  const expression = String(payload.expression || '').trim();
  const description = payload.description ? String(payload.description).trim() : null;

  if (!name) throw new Error('Name is required');
  if (!expression) throw new Error('Expression is required');
  validateExpression(expression);

  const baseSlug = slugify(name) || `formula-${Date.now()}`;
  let slug = baseSlug;
  let i = 1;
  while (await UserFormula.findOne({ where: { user_id: userId, slug } })) {
    slug = `${baseSlug}-${i++}`;
  }

  return UserFormula.create({
    user_id: userId,
    name,
    slug,
    expression,
    description,
    is_active: payload.is_active !== false,
    created_at: new Date(),
    updated_at: new Date(),
  }).then((row) => row.get({ plain: true }));
}

export async function updateUserFormula(userId, id, payload) {
  await asyncEnsure();
  const row = await UserFormula.findOne({ where: { id, user_id: userId } });
  if (!row) throw new Error('Formula not found');

  if (payload.name != null) {
    row.name = String(payload.name).trim();
  }
  if (payload.expression != null) {
    const expression = String(payload.expression).trim();
    validateExpression(expression);
    row.expression = expression;
  }
  if (payload.description !== undefined) {
    row.description = payload.description
      ? String(payload.description).trim()
      : null;
  }
  if (payload.is_active !== undefined) {
    row.is_active = Boolean(payload.is_active);
  }
  row.updated_at = new Date();
  await row.save();
  return row.get({ plain: true });
}

export async function deleteUserFormula(userId, id) {
  await asyncEnsure();
  const deleted = await UserFormula.destroy({ where: { id, user_id: userId } });
  return deleted > 0;
}

export async function getUserFormula(userId, id) {
  await asyncEnsure();
  return UserFormula.findOne({ where: { id, user_id: userId } });
}

export async function runUserFormula(userId, id, options = {}) {
  await asyncEnsure();
  const formula = await UserFormula.findOne({ where: { id, user_id: userId } });
  if (!formula) throw new Error('Formula not found');

  const asOf = options.date || (await getLatestPrDate());
  const { rows } = await buildIndicatorContexts({
    asOfDate: asOf,
    search: options.search || '',
    limit: Math.min(Number(options.limit) || 3000, 5000),
  });

  const matched = [];
  for (const ctx of rows) {
    try {
      const passes = expressionPasses(formula.expression, ctx);
      if (!passes) continue;
      matched.push({
        symbol: String(ctx.symbol || '')
          .trim()
          .replace(/\.(NS|BSE|BO)$/i, ''),
        name: ctx.name,
        security: ctx.security,
        series: ctx.series,
        trade_date: ctx.trade_date || asOf,
        close: ctx.close,
        volume: ctx.volume,
        change_percent: ctx.change_percent,
        rsi14: ctx.rsi14,
        sma20: ctx.sma20,
        sma50: ctx.sma50,
        bb_upper: ctx.bb_upper,
        bb_middle: ctx.bb_middle,
        bb_lower: ctx.bb_lower,
        obv: ctx.obv,
        result: evaluateExpression(formula.expression, ctx),
      });
    } catch {
      // skip securities that fail evaluation (missing vars)
    }
  }

  const page = Math.max(Number(options.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(options.pageSize) || 25, 1), 200);
  const start = (page - 1) * pageSize;
  const data = matched.slice(start, start + pageSize);

  return {
    formula: {
      id: formula.id,
      name: formula.name,
      slug: formula.slug,
      expression: formula.expression,
    },
    as_of: asOf,
    total: matched.length,
    page,
    pages: Math.ceil(matched.length / pageSize) || 0,
    data,
    allowed_vars: CUSTOM_FORMULA_ALLOWED_VARS,
  };
}

export { CUSTOM_FORMULA_ALLOWED_VARS, validateExpression };
