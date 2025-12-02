import { config } from 'dotenv';
import { resolve } from 'path';
import { defineConfig, env } from 'prisma/config';

// 根据 NODE_ENV 加载对应的环境文件
const nodeEnv = process.env.NODE_ENV || 'development';

// 先加载 .env，然后加载环境特定的文件（后加载的会覆盖先加载的）
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), `.env.${nodeEnv}`) });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
