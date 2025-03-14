import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/roboto/400.css'  // Regular weight

import './assets/main.css'
import './assets/base.css'
import './assets/markdown.css'

import App from './App.vue'

const app = createApp(App)

app.use(createPinia())

app.mount('#app')
