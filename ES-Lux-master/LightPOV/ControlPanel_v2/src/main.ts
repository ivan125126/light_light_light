import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './css/style.css'
// pre_view Web Component（Plan 3 遷移為 PreviewElement.ts）
import './js/pre_view.js'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
