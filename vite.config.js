import { defineConfig } from 'vite';
import { resolve } from 'path';
import glob from 'fast-glob';
import mkcert from 'vite-plugin-mkcert';

// Get all HTML files in src directory
const htmlFiles = glob.sync('src/**/*.html').reduce((acc, file) => {
  // Convert file path to entry point name
  const entryName = file
    .replace('src/', '')     // Remove src/ prefix
    .replace('.html', '');   // Remove .html extension
  
  acc[entryName] = resolve(__dirname, file);
  return acc;
}, {});

export default defineConfig({
  root: 'src',
  base: './',
  plugins: [
    mkcert()
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: htmlFiles,
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep TypeScript files in their original directories
          return chunkInfo.name.includes('/')
            ? `${chunkInfo.name.split('/').slice(0, -1).join('/')}/[name].js`
            : '[name].js';
        },
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          // Keep assets in their original directories
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/\.(mp3|mp4|webm|ogg|wav|jpg|png|gif|svg|webp)$/i.test(assetInfo.name)) {
            return `assets/[name][extname]`;
          }
          return '[name][extname]';
        }
      }
    }
  },
  server: {
    open: true,
    https: true
  }
}); 