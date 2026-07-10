import bcrypt from 'bcrypt';
import { User } from '../models/index.js';
import { resolveStockDbName } from './dbEnv.js';
import logger from './logger.js';

/**
 * Ensure `users` table exists and seed/update master account from .env.
 */
export async function ensureMasterUser() {
  const email = process.env.MASTER_EMAIL || 'admin@vap.local';
  const username = process.env.MASTER_USERNAME || 'master';
  const password = process.env.MASTER_PASSWORD || 'Admin@123';
  const dbName = resolveStockDbName();

  await User.sync();

  const hashedPassword = await bcrypt.hash(password, 10);
  const [user, created] = await User.findOrCreate({
    where: { email },
    defaults: {
      username,
      password: hashedPassword,
      role: 'master',
      phoneNumber: '',
      whatsappNumber: '',
    },
  });

  if (!created) {
    user.username = username;
    user.password = hashedPassword;
    user.role = 'master';
    await user.save();
  }

  const action = created ? 'created' : 'updated';
  const message = `Master user ${action} in ${dbName}.users`;

  logger.info(`✅ ${message} | email=${email} | role=master`);
  console.log('✅ Users table ready');
  console.log(`✅ ${message}`);
  console.log(`   Email: ${email}`);
  console.log(`   Table: ${dbName}.users`);

  if (process.env.NODE_ENV !== 'production') {
    console.log('🔐 Master password is set from MASTER_PASSWORD in backend/.env');
  } else if (!process.env.MASTER_PASSWORD) {
    logger.warn('⚠️ MASTER_PASSWORD is not set in production — using default password');
  }

  return { email, username, created };
}
