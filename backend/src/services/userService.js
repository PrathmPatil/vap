import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User, UserSubscription } from '../models/index.js';
import dotenv from 'dotenv';
import redis from '../config/redis.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { createWelcomeNotification } from './notificationInboxService.js';
import {
  addPeriodDays,
  formatPlanPrice,
  getPlanConfig,
  listPlans,
} from '../config/subscriptionPlans.js';

dotenv.config();

const checkAndCreateUserTable = async () => {
  try {
    await User.sync();
    await UserSubscription.sync();
    console.log('User table created successfully');
  } catch (error) {
    console.error('Error creating user table:', error);
  }
};

const sanitizeUser = (user) => {
  const userData = user.toJSON();
  delete userData.password;
  delete userData.createdAt;
  delete userData.updatedAt;
  return userData;
};

const getUserIdFromRequest = (req) => {
  const raw = req.user?.id ?? req.user?.userId ?? req.user?.user_id ?? req.userId;
  const userId = Number(raw);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
};

const serializeSubscription = (row) => {
  const item = row.toJSON ? row.toJSON() : row;
  const startedAt = new Date(item.started_at);
  const expiresAt = new Date(item.expires_at);
  const now = Date.now();
  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - now) / (1000 * 60 * 60 * 24)),
  );

  return {
    id: item.id,
    planId: item.plan_id,
    planName: item.plan_name,
    amount: Number(item.amount),
    currency: item.currency,
    priceLabel: `${item.currency === 'INR' ? '₹' : ''}${Number(item.amount).toLocaleString('en-IN')}`,
    status: item.status,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date(item.created_at).toISOString(),
    daysRemaining,
    isActive:
      item.status === 'active' && expiresAt.getTime() > now,
  };
};

async function ensureLegacySubscriptionRecord(user) {
  const count = await UserSubscription.count({ where: { user_id: user.id } });
  if (count > 0 || !user.is_subscribed) {
    return;
  }

  const plan = getPlanConfig('yearly');
  const startedAt = user.updatedAt ? new Date(user.updatedAt) : new Date();
  const expiresAt = addPeriodDays(startedAt, plan.id);

  await UserSubscription.create({
    user_id: user.id,
    plan_id: plan.id,
    plan_name: plan.name,
    amount: plan.amount,
    currency: plan.currency,
    status: 'active',
    started_at: startedAt,
    expires_at: expiresAt,
  });
}

async function getCurrentSubscription(userId) {
  const now = new Date();
  const active = await UserSubscription.findOne({
    where: {
      user_id: userId,
      status: 'active',
      expires_at: { [Op.gt]: now },
    },
    order: [['expires_at', 'DESC']],
  });

  return active ? serializeSubscription(active) : null;
}

export const registerUser = async (req, res) => {
  try {
    const { username, email, password, phoneNumber, whatsappNumber } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await checkAndCreateUserTable();

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'user',
      phoneNumber,
      whatsappNumber
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const userData = user.toJSON();

    delete userData.password;
    delete userData.createdAt;
    delete userData.updatedAt;

    try {
      await createWelcomeNotification(user.id, user.username || user.email);
    } catch (notifyError) {
      console.warn('Welcome notification skipped:', notifyError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      accessToken,
      user: userData
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: `${error.errors[0].path} already exists`
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors.map((e) => e.message).join(', ')
      });
    }

    console.error('Register Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    await checkAndCreateUserTable();

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const userData = user.toJSON();

    delete userData.password;
    delete userData.createdAt;
    delete userData.updatedAt;

    try {
      await createWelcomeNotification(user.id, user.username || user.email);
    } catch (notifyError) {
      console.warn('Welcome notification skipped:', notifyError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: userData
    });
  } catch (error) {
    console.error('Login Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const profile = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    await checkAndCreateUserTable();
    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Error fetching user profile', error });
  }
};

export const getSubscriptionDetails = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await checkAndCreateUserTable();
    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    await ensureLegacySubscriptionRecord(user);

    const historyRows = await UserSubscription.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
    });

    const current = await getCurrentSubscription(userId);
    const history = historyRows.map(serializeSubscription);
    const plans = listPlans().map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: formatPlanPrice(plan),
      period: plan.periodLabel,
      amount: plan.amount,
      currency: plan.currency,
      highlight: Boolean(plan.highlight),
      badge: plan.badge || null,
      features: plan.features,
      isCurrent: current?.planId === plan.id && current?.isActive,
    }));

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
      isSubscribed: Boolean(user.is_subscribed) && Boolean(current),
      current,
      history,
      plans,
    });
  } catch (error) {
    console.error('Subscription details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch subscription details',
    });
  }
};

export const activateSubscription = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { acceptTerms, plan: rawPlan } = req.body || {};

    if (!acceptTerms) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the Terms & Conditions to subscribe',
      });
    }

    const planId = rawPlan === 'monthly' ? 'monthly' : 'yearly';
    const plan = getPlanConfig(planId);

    await checkAndCreateUserTable();
    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    const now = new Date();
    await UserSubscription.update(
      { status: 'superseded' },
      {
        where: {
          user_id: userId,
          status: 'active',
        },
      },
    );

    const startedAt = now;
    const expiresAt = addPeriodDays(startedAt, planId);

    const record = await UserSubscription.create({
      user_id: userId,
      plan_id: plan.id,
      plan_name: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      status: 'active',
      started_at: startedAt,
      expires_at: expiresAt,
    });

    user.is_subscribed = true;
    await user.save();

    const current = serializeSubscription(record);

    return res.status(200).json({
      success: true,
      message: 'Premium subscription activated',
      user: sanitizeUser(user),
      subscription: current,
    });
  } catch (error) {
    console.error('Subscription Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to activate subscription',
    });
  }
};

export const logout = async (req, res) => {
  res.status(200).json({ success: true, message: 'Logout successful' });
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }
    res
      .status(200)
      .json({ success: true, message: 'Password reset link sent' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing forgot password',
      error
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const decoded = jwt.verify(token, 'your-secret-key');
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Error resetting password', error });
  }
};

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) return res.sendStatus(401);

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

  const stored = await redis.get(`refresh:${decoded.id}`);

  if (stored !== token) return res.sendStatus(403);

  const accessToken = generateAccessToken({ id: decoded.id });

  res.json({ accessToken });
};
