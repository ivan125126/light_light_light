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
      '/get_effect':       'http://localhost:10240',
      '/start':            'http://localhost:10240',
      '/esp_time':         'http://localhost:10240',
      '/exe_mode':         'http://localhost:10240',
      '/get_stat':         'http://localhost:10240',
      '/get_light':        'http://localhost:10240',
      '/update_file':      'http://localhost:10240',
      '/update_lux_mode':  'http://localhost:10240',
      '/update_lux_reset': 'http://localhost:10240',
      '/live_effect':      'http://localhost:10240',
      '/health':           'http://localhost:10240',
      '/push_effect_map':  'http://localhost:10240',
      
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    root: '.',
  }
})
