import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({root:resolve(import.meta.dirname),base:'./',publicDir:resolve(import.meta.dirname,'../browser-public'),plugins:[react()],build:{outDir:resolve(import.meta.dirname,'../docs'),emptyOutDir:true,assetsDir:'assets',sourcemap:false,rollupOptions:{input:{main:resolve(import.meta.dirname,'index.html'),callback:resolve(import.meta.dirname,'oauth-callback.html')}}}});
