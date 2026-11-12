import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    allowedHosts: ['.lhr.life'],
  },
  preview: {
    allowedHosts: ['.lhr.life'],
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
