import { defineConfig } from 'vite';
import { glob } from 'glob';
import { resolve } from 'path';
import mkcert from 'vite-plugin-mkcert';

// Get all HTML files in src directory and subdirectories
const htmlFiles = glob.sync('**/*.html', {
  ignore: ['dist/**', 'node_modules/**']
}).map(file => resolve(__dirname, file));

export default defineConfig({
  root: 'src',
  base: './',
  plugins: [
    mkcert()
  ],
  build: {
    outDir: '../dist',
    publicDir: './src/public',
    emptyOutDir: true,
    rollupOptions: {
      input: htmlFiles,
      output: {
        entryFileNames: (chunkInfo) => {
          // Handle both .ts and .js files
          return chunkInfo.name.includes('/')
            ? `${chunkInfo.name.split('/').slice(0, -1).join('/')}/[name].js`
            : '[name].js';
        },
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          console.log(assetInfo);
          // Keep assets in their original directories
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/\.(mp3|mp4|webm|ogg|wav|jpg|png|gif|svg|webp|arfont)$/i.test(assetInfo.name)) {
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
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
}); 