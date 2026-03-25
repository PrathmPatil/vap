import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import dotenv from 'dotenv';
import redis from '../config/redis.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
dotenv.config();

const checkAndCreateUserTable = async () => {
  try {
    await User.sync();
    console.log('User table created successfully');
  } catch (error) {
    console.error('Error creating user table:', error);
  }
};

export const registerUser = async (req, res) => {
  try {
    const { username, email, password, phoneNumber, whatsappNumber } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await checkAndCreateUserTable();

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      phoneNumber,
      whatsappNumber
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 604800);

    // res.cookie('refreshToken', refreshToken, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'strict'
    // });

    delete user.password;
    delete user.createdAt;
    delete user.updatedAt;

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      accessToken,
      user
    });
  } catch (error) {
    // Handle duplicate email
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: `${error.errors[0].path} already exists`
      });
    }

    // Handle validation errors
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

    // await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 604800);

    // res.cookie('refreshToken', refreshToken, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'strict'
    // });

    delete user.password;
    delete user.createdAt;
    delete user.updatedAt;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user
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
    const userId = req.userId; // Assuming you have middleware to set req.userId
    await checkAndCreateUserTable();
    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Error fetching user profile', error });
  }
};

export const logout = async (req, res) => {
  // Since JWT is stateless, you can't really "logout" on the server side.
  // You can implement token blacklisting or simply let the token expire.
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
    // Implement password reset logic here (e.g., send email with reset link)
    res
      .status(200)
      .json({ success: true, message: 'Password reset link sent' });
  } catch (error) {
    res
      .status(500)
      .json({
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