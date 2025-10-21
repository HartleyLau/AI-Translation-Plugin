<script lang="ts" setup>
import { onMounted, ref } from 'vue';
// 移除 Hello 组件
import Translate from './Translate/index.vue'
import Settings from './Settings/index.vue'

const route = ref('')
// 初始化 enterAction 为具有完整结构的对象，避免 undefined 访问错误
const enterAction = ref({ 
  code: 'translate',
  type: '',
  payload: null
})
const hasUtools = ref(false)
const svcAvailable = ref(false)

/**
 * 跳转到设置页面
 */
const goToSettings = () => {
  route.value = 'settings'
}

/**
 * 从设置页面返回翻译页面
 */
const backToTranslate = () => {
  route.value = 'translate'
}

/**
 * 组件挂载时初始化 uTools 环境和服务检测
 */
onMounted(() => {
  const u = (typeof window !== 'undefined' ? (window as any).utools : undefined)
  const svc = (typeof window !== 'undefined' ? (window as any).services : undefined)
  svcAvailable.value = !!(svc && typeof svc.readFile === 'function' && typeof svc.httpRequest === 'function')
  hasUtools.value = !!(u && typeof u.onPluginEnter === 'function')
  if (hasUtools.value) {
    // 先给一个默认路由，避免回调触发前出现空白
    route.value = 'translate'
    enterAction.value = { 
      code: 'translate',
      type: '',
      payload: null
    }
    u.onPluginEnter((action: any) => {
      route.value = action.code
      // 确保 enterAction 始终有完整的结构
      enterAction.value = {
        code: action.code || 'translate',
        type: action.type || '',
        payload: action.payload || null
      }
      if (!["translate"].includes(route.value)) {
        route.value = 'translate'
        enterAction.value = { 
          code: 'translate',
          type: '',
          payload: null
        }
      }
    })
    if (typeof u.onPluginOut === 'function') {
      u.onPluginOut((isKill: boolean) => {
        route.value = ''
      })
    }
  } else {
    route.value = 'translate'
    enterAction.value = { 
      code: 'translate',
      type: '',
      payload: null
    }
  }
})
</script>

<template>
  <!-- 移除 hello 路由与组件块 -->
  <template v-if="route === 'translate'">
    <Translate v-if="hasUtools" :enterAction="enterAction" @go-to-settings="goToSettings"></Translate>
    <div v-else style="padding:16px;">
      <h2>本地AI翻译（浏览器预览）</h2>
      <p>此页面依赖 uTools 环境，请在 uTools 中打开插件。</p>
    </div>
  </template>
  <template v-if="route === 'settings'">
    <Settings :enterAction="enterAction" @back-to-translate="backToTranslate"></Settings>
  </template>
  <!-- 调试信息：帮助定位空白页问题，可随时移除 -->
  <!-- <div style="position:fixed;left:8px;bottom:8px;padding:6px 10px;background:#f6f8fa;border:1px solid #d0d7de;border-radius:6px;color:#24292f;font-size:12px;z-index:9999;">
    route={{ route }} | hasUtools={{ hasUtools }} | services={{ svcAvailable ? 'ok' : 'missing' }} | action={{ (enterAction as any)?.code || '' }}
  </div> -->
</template>
