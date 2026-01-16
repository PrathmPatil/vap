import mysql from 'mysql2/promise';

export async function ensureDatabase(dbName, config) {
  if (!dbName) return;

  const connection = await mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    port: config.port || 3306,
  });

  await connection.execute(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\``
  );

  await connection.end();
  console.log(`✅ Database ensured: ${dbName}`);
}
