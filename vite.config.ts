import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{proxy:{'/api':'http://127.0.0.1:5187'}},test:{include:['tests/**/*.test.{ts,tsx}'],environment:'node'},build:{rollupOptions:{output:{manualChunks:{map:['maplibre-gl']}}}}});
