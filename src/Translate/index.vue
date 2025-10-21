<script lang="ts" setup>
import { reactive, onMounted, ref } from 'vue';

const props = defineProps({
  enterAction: {
    type: Object,
    required: true
  }
})

// 定义事件
const emit = defineEmits(['go-to-settings'])

// 使用一个响应式对象替代多个 ref，避免模板渲染期间出现 .value 访问
const state = reactive({
  sourceText: '',
  translatedText: '',
  isLoading: false,
  sourceLang: 'auto',
  targetLang: 'zh'
})

// AI设置
const aiSettings = reactive({
  apiUrl: 'http://localhost:1234/v1/chat/completions',
  modelName: 'local-model',
  temperature: 0.3,
  maxTokens: 2000,
  systemPrompt: `You are a professional {{to}} native translator who needs to fluently translate text into {{to}}.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text
3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency
4. For content that should not be translated (such as proper nouns, code, etc.), keep the original text.
5. If input contains %%, use %% in your output, if input has no %%, don't use %% in your output{{title_prompt}}{{summary_prompt}}{{terms_prompt}}

## OUTPUT FORMAT:
- **Single paragraph input** → Output translation directly (no separators, no extra text)
- **Multi-paragraph input** → Use %% as paragraph separator between translations

## Examples
### Multi-paragraph Input:
Paragraph A
%%
Paragraph B
%%
Paragraph C
%%
Paragraph D

### Multi-paragraph Output:
Translation A
%%
Translation B
%%
Translation C
%%
Translation D

### Single paragraph Input:
Single paragraph content

### Single paragraph Output:
Direct translation without separators`,
  userPrompt: 'Translate to {{to}} (output translation only):\n\n{{text}}'
})

/**
 * 从本地存储加载AI设置
 */
const loadAISettings = () => {
  try {
    const u = (typeof window !== 'undefined' ? (window as any).utools : undefined)
    let savedSettings = null
    
    if (u && typeof u.dbStorage === 'object') {
      // 优先使用uTools的数据存储
      const data = u.dbStorage.getItem('ai_translate_settings')
      if (data) {
        savedSettings = JSON.parse(data)
      }
    } else {
      // 降级到localStorage
      const data = localStorage.getItem('ai_translate_settings')
      if (data) {
        savedSettings = JSON.parse(data)
      }
    }
    
    if (savedSettings) {
      aiSettings.apiUrl = savedSettings.apiUrl || aiSettings.apiUrl
      aiSettings.modelName = savedSettings.modelName || aiSettings.modelName
      aiSettings.temperature = savedSettings.temperature || aiSettings.temperature
      aiSettings.maxTokens = savedSettings.maxTokens || aiSettings.maxTokens
      aiSettings.systemPrompt = savedSettings.systemPrompt || aiSettings.systemPrompt
      aiSettings.userPrompt = savedSettings.userPrompt || aiSettings.userPrompt
      console.log('AI设置已加载:', savedSettings)
    }
  } catch (error) {
    console.error('加载AI设置失败:', error)
  }
}

// 语言选项 - 使用 ref 包装确保响应式
const languageOptions = ref([
  { value: 'auto', label: '自动检测' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: '英语' },
  { value: 'ja', label: '日语' },
  { value: 'ko', label: '韩语' },
  { value: 'fr', label: '法语' },
  { value: 'de', label: '德语' },
  { value: 'es', label: '西班牙语' },
  { value: 'ru', label: '俄语' }
])

/**
 * 处理System Prompt中的变量替换
 * @param {string} prompt - 原始提示词
 * @param {string} targetLang - 目标语言
 * @returns {string} - 处理后的提示词
 */
const processPromptVariables = (prompt: string, targetLang: string): string => {
  let processedPrompt = prompt
  
  // 替换 {{to}} 变量为目标语言的英文名称
  const targetLanguageName = getEnglishLanguageName(targetLang)
  processedPrompt = processedPrompt.replace(/\{\{to\}\}/g, targetLanguageName)
  
  // 暂时移除其他变量（后续可以根据需要实现）
  processedPrompt = processedPrompt.replace(/\{\{title_prompt\}\}/g, '')
  processedPrompt = processedPrompt.replace(/\{\{summary_prompt\}\}/g, '')
  processedPrompt = processedPrompt.replace(/\{\{terms_prompt\}\}/g, '')
  
  return processedPrompt
}

/**
 * 处理User Prompt中的变量替换
 * @param {string} prompt - 原始提示词
 * @param {string} targetLang - 目标语言
 * @param {string} sourceText - 源文本
 * @returns {string} - 处理后的提示词
 */
const processUserPromptVariables = (prompt: string, targetLang: string, sourceText: string): string => {
  let processedPrompt = prompt
  
  // 替换 {{to}} 变量为目标语言的英文名称
  const targetLanguageName = getEnglishLanguageName(targetLang)
  processedPrompt = processedPrompt.replace(/\{\{to\}\}/g, targetLanguageName)
  
  // 替换 {{text}} 变量为源文本
  processedPrompt = processedPrompt.replace(/\{\{text\}\}/g, sourceText)
  
  return processedPrompt
}

/**
 * 获取语言的英文名称（用于System Prompt）
 * @param {string} langCode - 语言代码
 * @returns {string} - 英文语言名称
 */
const getEnglishLanguageName = (langCode: string): string => {
  const englishLanguageMap: Record<string, string> = {
    'auto': 'auto-detected language',
    'zh': 'Chinese',
    'en': 'English',
    'ja': 'Japanese',
    'ko': 'Korean',
    'fr': 'French',
    'de': 'German',
    'es': 'Spanish',
    'ru': 'Russian'
  }
  return englishLanguageMap[langCode] || langCode
}

/**
 * 跳转到设置页面
 */
const goToSettings = () => {
  emit('go-to-settings')
}

// 确保数据在组件初始化时就可用
console.log('=== 初始化调试信息 ===');
console.log('初始化languageOptions:', languageOptions.value);
console.log('languageOptions长度:', languageOptions.value?.length);
console.log('第一个选项:', languageOptions.value?.[0]);

function onSourceLangChange(e: Event) {
  const v = (e.target as HTMLSelectElement)?.value
  console.log('源语言改变:', v);
  state.sourceLang = v || 'auto'
}
function onTargetLangChange(e: Event) {
  const v = (e.target as HTMLSelectElement)?.value
  console.log('目标语言改变:', v);
  state.targetLang = v || 'zh'
}
function onSourceTextInput(e: Event) {
  const v = (e.target as HTMLTextAreaElement)?.value ?? ''
  state.sourceText = v
}

// 调用本地大模型API进行翻译
const translateText = async () => {
  const u = (typeof window !== 'undefined' ? (window as any).utools : undefined)
  const svc = (typeof window !== 'undefined' ? (window as any).services : undefined)
  if (!state.sourceText.trim()) {
    if (u && typeof u.showNotification === 'function') {
      u.showNotification('请输入要翻译的内容')
    }
    return;
  }

  state.isLoading = true;
  state.translatedText = '';

  try {
    if (!svc || typeof svc.httpRequest !== 'function') {
      throw new Error('本地服务不可用：services.httpRequest 未注入')
    }
    
    console.log('=== 开始调用AI翻译API ===');
    console.log('请求URL:', aiSettings.apiUrl);
    console.log('模型名称:', aiSettings.modelName);
    console.log('源语言:', state.sourceLang, '目标语言:', state.targetLang);
    console.log('要翻译的文本:', state.sourceText);
    
    // 处理System Prompt中的变量
    const processedSystemPrompt = processPromptVariables(aiSettings.systemPrompt, state.targetLang)
    console.log('处理后的System Prompt:', processedSystemPrompt);
    
    // 构建消息数组
    const messages = [
      {
        role: 'system',
        content: processedSystemPrompt
      }
    ]
    
    // 如果有用户提示词，处理变量并添加到消息中
    if (aiSettings.userPrompt.trim()) {
      const processedUserPrompt = processUserPromptVariables(aiSettings.userPrompt, state.targetLang, state.sourceText)
      console.log('处理后的User Prompt:', processedUserPrompt);
      messages.push({
        role: 'user',
        content: processedUserPrompt
      })
    } else {
      // 如果没有用户提示词，直接添加要翻译的文本
      messages.push({
        role: 'user',
        content: state.sourceText
      })
    }
    
    const requestBody = {
      model: aiSettings.modelName,
      messages: messages,
      temperature: aiSettings.temperature,
      max_tokens: aiSettings.maxTokens
    };
    
    console.log('请求体:', JSON.stringify(requestBody, null, 2));
    
    const response = await svc.httpRequest(aiSettings.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('响应状态码:', response.status);
    console.log('响应头:', response.headers);
    console.log('响应数据:', response.data);

    if (response.status !== 200) {
      throw new Error(`API请求失败，状态码: ${response.status}，响应: ${response.data}`);
    }

    const data = response.json();
    console.log('解析后的响应数据:', data);
    
    if (data.choices && data.choices.length > 0) {
      state.translatedText = data.choices[0].message.content.trim();
      console.log('翻译结果:', state.translatedText);
    } else {
      throw new Error('翻译API返回格式错误，响应数据: ' + JSON.stringify(data));
    }
  } catch (error) {
    console.error('=== 翻译错误详情 ===');
    console.error('错误对象:', error);
    console.error('错误消息:', error && (error as any).message ? (error as any).message : String(error));
    console.error('错误堆栈:', error && (error as any).stack ? (error as any).stack : '无堆栈信息');
    
    const msg = '翻译失败，请检查本地大模型服务是否正常运行\n错误信息: ' + (error && (error as any).message ? (error as any).message : String(error))
    state.translatedText = msg;
    if (u && typeof u.showNotification === 'function') {
      u.showNotification('翻译失败，请检查本地大模型服务是否正常运行')
    }
  } finally {
    state.isLoading = false;
  }
};

/**
 * 获取语言名称
 */
const getLanguageName = (code: string) => {
  const lang = languageOptions.value.find(option => option.value === code);
  return lang ? lang.label : code;
};

// 清空输入和结果
const clearAll = () => {
  state.sourceText = '';
  state.translatedText = '';
};

// 复制翻译结果
const copyResult = () => {
  const u = (typeof window !== 'undefined' ? (window as any).utools : undefined)
  if (state.translatedText && u && typeof u.copyText === 'function') {
    u.copyText(state.translatedText);
    if (typeof u.showNotification === 'function') {
      u.showNotification('翻译结果已复制到剪贴板');
    }
  }
};

/**
 * 组件挂载时的处理
 */
onMounted(() => {
  // 加载AI设置
  loadAISettings()
  
  // 添加调试日志
  console.log('=== 组件挂载调试信息 ===');
  console.log('组件挂载完成');
  console.log('languageOptions:', languageOptions.value);
  console.log('state.sourceLang:', state.sourceLang);
  console.log('state.targetLang:', state.targetLang);
  console.log('AI设置:', aiSettings);
  
  // 检查DOM元素
  const selects = document.querySelectorAll('.lang-select');
  console.log('找到的select元素数量:', selects.length);
  selects.forEach((select, index) => {
    console.log(`Select ${index} 的选项数量:`, select.children.length);
  });
  
  // 如果有传入的文本，自动填入输入框
  if (props.enterAction && props.enterAction.payload && props.enterAction.payload.text) {
    state.sourceText = props.enterAction.payload.text;
  }
});
</script>

<template>
  <div class="translate-container">
    <div class="translate-header">
      <div class="header-left">
        <h2>本地AI翻译</h2>
      </div>
      <div class="header-right">
        <button @click="goToSettings" class="settings-btn" title="设置">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m17-4a4 4 0 0 1-8 0 4 4 0 0 1 8 0zM7 21a4 4 0 0 1-8 0 4 4 0 0 1 8 0z"></path>
          </svg>
          设置
        </button>
      </div>
      <div class="language-selector">
        <select :value="state.sourceLang" @change="onSourceLangChange" class="lang-select">
          <option v-for="lang in languageOptions" :key="lang.value" :value="lang.value">
            {{ lang.label }}
          </option>
        </select>
        <span class="swap-icon">→</span>
        <select :value="state.targetLang" @change="onTargetLangChange" class="lang-select">
          <template v-for="lang in languageOptions" :key="'target-' + lang.value">
            <option v-if="lang.value !== 'auto'" :value="lang.value">
              {{ lang.label }}
            </option>
          </template>
        </select>
      </div>
    </div>

    <div class="translate-content">
      <div class="input-section">
        <div class="section-header">
          <span>原文</span>
          <button @click="clearAll" class="clear-btn" v-if="state.sourceText || state.translatedText">清空</button>
        </div>
        <textarea
          :value="state.sourceText"
          @input="onSourceTextInput"
          placeholder="请输入要翻译的内容..."
          class="input-textarea"
          rows="6"
        ></textarea>
        <div class="input-footer">
          <span class="char-count">{{ state.sourceText.length }} 字符</span>
          <button @click="translateText" class="translate-btn" :disabled="state.isLoading || !(state.sourceText && state.sourceText.trim())">
            {{ state.isLoading ? '翻译中...' : '翻译' }}
          </button>
        </div>
      </div>

      <div class="result-section">
        <div class="section-header">
          <span>译文</span>
          <button @click="copyResult" class="copy-btn" v-if="state.translatedText">复制</button>
        </div>
        <div class="result-container">
          <div v-if="state.isLoading" class="loading">
            <div class="loading-spinner"></div>
            <span>正在翻译中...</span>
          </div>
          <textarea
            v-else
            :value="state.translatedText"
            placeholder="翻译结果将显示在这里..."
            class="result-textarea"
            rows="6"
            readonly
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.translate-container {
  width: 100%;
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  background-attachment: fixed;
  overflow: visible;
}

.translate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 4px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-white);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-small);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
  box-shadow: var(--shadow-light);
  min-height: 36px;
}

.settings-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: var(--shadow-medium);
}

.settings-btn svg {
  flex-shrink: 0;
}

.translate-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.language-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1001;
}

.lang-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-small);
  background-color: var(--bg-white);
  font-size: 14px;
  position: relative;
  z-index: 1000;
  min-width: 120px;
  transition: var(--transition);
  min-height: 36px;
  box-sizing: border-box;
}

.lang-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.swap-icon {
  font-size: 18px;
  color: var(--text-secondary);
  padding: 8px;
  border-radius: 50%;
  transition: var(--transition);
}

.swap-icon:hover {
  background: var(--bg-hover);
  color: var(--primary-color);
}

.translate-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 100%;
  overflow: visible;
}

.input-section, .result-section {
  background: var(--bg-white);
  border-radius: var(--radius-medium);
  padding: 20px;
  box-shadow: var(--shadow-medium);
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header span {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 16px;
}

.clear-btn, .copy-btn {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: var(--radius-small);
  transition: var(--transition);
  min-height: 28px;
}

.clear-btn:hover, .copy-btn:hover {
  background: rgba(24, 144, 255, 0.1);
  color: var(--primary-hover);
}

.input-textarea, .result-textarea {
  width: 100%;
  max-width: 100%;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-small);
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  transition: var(--transition);
}

.input-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.result-textarea {
  background-color: var(--bg-gray);
  border-color: var(--border-color);
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}

.char-count {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.translate-btn {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: var(--bg-white);
  border: none;
  padding: 10px 24px;
  border-radius: var(--radius-small);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: var(--transition);
  min-height: 40px;
  box-shadow: var(--shadow-light);
}

.translate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.translate-btn:active:not(:disabled) {
  transform: translateY(0);
}

.translate-btn:disabled {
  background: var(--bg-hover);
  color: var(--text-disabled);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.result-container {
  position: relative;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--bg-hover);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .translate-container {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%);
  }
  
  .translate-header h2 {
    color: #ffffff;
    -webkit-text-fill-color: #ffffff;
  }
  
  .input-section, .result-section {
    background: rgba(45, 55, 72, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .section-header span {
    color: #ffffff;
  }
  
  .input-textarea, .result-textarea {
    background: rgba(26, 32, 44, 0.6);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .result-textarea {
    background: rgba(26, 32, 44, 0.4);
  }
  
  .char-count {
    color: #a0aec0;
  }
  
  .lang-select {
    background: rgba(45, 55, 72, 0.8);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .settings-btn {
    background: rgba(45, 55, 72, 0.8);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }
}
</style>