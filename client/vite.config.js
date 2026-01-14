import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from parent directory
  const env = loadEnv(mode, '../', '')
  
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_APP_NAME': JSON.stringify(env.APP_NAME || 'BALES.IN'),
      'import.meta.env.VITE_APP_TAGLINE': JSON.stringify(env.APP_TAGLINE || 'Balas Chat, Lebih Cepat!'),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
