import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    // 통합/E2E 테스트를 위해 순차 실행
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'test/'],
    },
    setupFiles: ['test/setup.ts'],
  },
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, './src/domain'),
      '@application': path.resolve(__dirname, './src/application'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@interface': path.resolve(__dirname, './src/interface'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
});
