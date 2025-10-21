import { createApp } from 'vue'
import './main.css'
import App from './App.vue'

function ensureErrorBox() {
  const box = document.getElementById('__debug_error_box__') || (() => {
    const d = document.createElement('div')
    d.id = '__debug_error_box__'
    d.style.cssText = 'position:fixed;left:8px;top:8px;padding:8px 12px;max-width:70vw;background:#ffecec;color:#900;border:1px solid #f3b5b5;border-radius:6px;z-index:99999;font-size:12px;white-space:pre-wrap;box-shadow:0 2px 8px rgba(0,0,0,0.1);'
    document.body.appendChild(d)
    return d
  })()
  return box
}

function showErrorOverlay(err, context) {
  const box = ensureErrorBox()
  const message = (err && err.message) ? err.message : String(err)
  const stack = (err && err.stack) ? err.stack : ''
  const ctx = context ? `\n[Context] ${context}` : ''
  box.textContent = `渲染错误: ${message}${ctx}\n${stack}`
}

const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err, info)
  showErrorOverlay(err, info)
}

window.addEventListener('error', (e) => {
  console.error('[Window Error]', e.error || e.message)
  showErrorOverlay(e.error || e.message, 'window.onerror')
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Rejection]', e.reason)
  showErrorOverlay(e.reason, 'unhandledrejection')
})

app.mount('#app')