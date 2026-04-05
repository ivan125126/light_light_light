import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/get_effect':       'http://localhost:20480',
      '/start':            'http://localhost:20480',
      '/esp_time':         'http://localhost:20480',
      '/exe_mode':         'http://localhost:20480',
      '/get_stat':         'http://localhost:20480',
      '/get_light':        'http://localhost:20480',
      '/update_file':      'http://localhost:20480',
      '/update_lux_mode':  'http://localhost:20480',
      '/update_lux_reset': 'http://localhost:20480',
      '/live_effect':      'http://localhost:20480',
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    root: '.',
  }
})
