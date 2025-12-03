import { registerAs } from '@nestjs/config';

const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'qm_photo_db',
  url: process.env.DATABASE_URL,
}));

export type DatabaseConfig = ReturnType<typeof databaseConfig>;
export default databaseConfig;
