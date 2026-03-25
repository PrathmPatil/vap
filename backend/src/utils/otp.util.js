import redis from "../config/redis.js";

export const sendOtp = async (req, res) => {
  const { phone } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000);

  await redis.set(`otp:${phone}`, otp, "EX", 300);

  console.log("OTP:", otp);

  res.json({ message: "OTP sent" });
};

export const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  const storedOtp = await redis.get(`otp:${phone}`);

  if (storedOtp !== otp) {
    return res.status(401).json({ message: "Invalid OTP" });
  }

  const user = await db.User.findOne({ phone });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.json({ accessToken });
};