import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/main.css';

import App from './Esv.vue'

const app = createApp(App)

app.use(createPinia())

app.mount('#app')
