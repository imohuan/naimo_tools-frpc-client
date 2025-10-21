/**
 * Preload 构建配置
 * 专门用于配置 preload.ts 的构建选项
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';

/**
 * Preload 构建配置
 */
export default defineConfig({
  base: './',
  build: {
    lib: {
      entry: resolve(__dirname, './src/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.js'
    },
    outDir: resolve(__dirname, './dist'),
    emptyOutDir: false,
    sourcemap: false,
    minify: false, // 不压缩，便于调试
    commonjsOptions: {
      transformMixedEsModules: true,
      ignoreDynamicRequires: false,
    },
    rollupOptions: {
      external: [
        'electron',
        // 第三方依赖 - 在 Naimo 环境中这些模块需要作为 external
        // 'tar',
        // 'adm-zip',
        // 将所有 Node.js 内置模块标记为 external
        ...builtinModules.flatMap(m => [m, `node:${m}`])
      ],
      output: {
        format: 'cjs',
        exports: 'auto',
        // 确保 preload 是单个文件，不分块
        inlineDynamicImports: true,
        interop: 'auto',
        externalLiveBindings: false
      }
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    },
    conditions: ['node', 'require'],
    mainFields: ['main', 'module']
  },
  optimizeDeps: {
    exclude: ['tar', 'adm-zip']
  }
})

