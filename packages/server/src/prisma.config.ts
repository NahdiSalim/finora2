// prisma/prisma.config.ts
import { join } from 'path';

export default {
  schema: join(__dirname, 'src/prisma/schema.prisma'),
  datasource: {
    db: {
      url: process.env.DATABASE_URL,
      provider: 'postgresql',
    },
  },
  generators: {
    client: {
      provider: 'prisma-client-js',
    },
  },
};
