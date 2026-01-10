require("dotenv").config();

// MySQL-only configuration
const createDatabaseConfig = (env = "development") => {
  const testSuffix = env === "test" ? "_test" : "";
  return {
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: (process.env.DB_DATABASE || "waserver") + testSuffix,
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    timezone: "Asia/Jakarta",
    dialectOptions: {
      charset: "utf8mb4",
    },
    define: {
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
      timestamps: true,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };
};

module.exports = {
  development: createDatabaseConfig("development"),
  test: createDatabaseConfig("test"),
  production: createDatabaseConfig("production"),
};
