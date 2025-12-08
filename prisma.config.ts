import { defineConfig } from 'prisma/config';

export default defineConfig({
	schema: './apps/api-gateway/prisma/schema.prisma',
	migrations: {
		path: './apps/api-gateway/prisma/migrations',
	},
});
