const mysql = require("mysql2/promise");

function isDatabaseConfigured() {
  return Boolean(
    process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD,
  );
}

// 配置齐全时创建连接池，供多次查询复用
function createPool() {
  if (!isDatabaseConfigured()) return null;
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
    queueLimit: 0,
    charset: "utf8mb4",
  });
}

// SQL 与参数分开传入，让数据库处理参数，避免直接拼接用户输入
async function query(pool, sql, params = []) {
  if (!pool) throw new Error("数据库尚未配置");
  return pool.execute(sql, params);
}

module.exports = { createPool, query, isDatabaseConfigured };
