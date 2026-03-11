export const databaseConfig = {
  write: {
    host: process.env.MYSQL_WRITE_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_WRITE_PORT || '3306', 10),
    user: process.env.MYSQL_WRITE_USER || 'user',
    password: process.env.MYSQL_WRITE_PASSWORD || 'userpassword',
    database: process.env.MYSQL_WRITE_DATABASE || 'product_write',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
  read: {
    host: process.env.MYSQL_READ_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_READ_PORT || '3307', 10),
    user: process.env.MYSQL_READ_USER || 'user',
    password: process.env.MYSQL_READ_PASSWORD || 'userpassword',
    database: process.env.MYSQL_READ_DATABASE || 'product_read',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
  },
};
