import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './css/style.css'
import './lib/PreviewElement'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
