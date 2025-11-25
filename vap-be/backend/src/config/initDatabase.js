// config/initDatabase.js
import sequelize from './database.js';
import '../models/index.js'; // Loads all models and associations

export async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');

    // ✅ Sync all models - this will automatically add createdAt/updatedAt if missing
    await sequelize.sync();

    console.log('✅ All tables synced successfully.');
  } catch (error) {
    console.error('❌ Unable to connect or sync the database:', error);
    process.exit(1);
  }
}
