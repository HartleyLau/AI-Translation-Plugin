<script lang="ts" setup>
import { reactive, onMounted, ref, computed } from 'vue';

const props = defineProps({
  enterAction: {
    type: Object,
    required: true
  }
})

// 发射事件给父组件
const emit = defineEmits(['back-to-translate'])

// 预览相关状态
const previewLang = ref('zh')

/**
 * 获取语言名称
 * @param {string} langCode - 语言代码
 * @returns {string} - 语言名称
 */
const getLanguageName = (langCode: string): string => {
  const languageMap: Record<string, string> = {
    'auto': '自动检测',
    'zh': '中文',
    'en': '英语',
    'ja': '日语',
    'ko': '韩语',
    'fr': '法语',
    'de': '德语',
    'es': '西班牙语',
    'ru': '俄语'
  }
  return languageMap[langCode] || langCode
}

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
 * 计算处理后的System Prompt
 */
const processedSystemPrompt = computed(() => {
  return processPromptVariables(settings.systemPrompt, previewLang.value)
})

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
 * 计算处理后的User Prompt
 */
const processedUserPrompt = computed(() => {
  const sampleText = "Hello, how are you today?"
  return processUserPromptVariables(settings.userPrompt, previewLang.value, sampleText)
})

/**
 * 设置状态管理
 */
const settings = reactive({
  apiUrl: 'http://localhost:1234/v1/chat/completions',
  modelName: '',
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
  userPrompt: 'Translate to {{to}} (output translation only):\n\n{{text}}',
  isLoading: false,
  testResult: ''
})

/**
 * 验证设置输入
 */
const validateSettings = () => {
  const errors = []
  
  // 验证API地址
  if (!settings.apiUrl.trim()) {
    errors.push('API地址不能为空')
  } else {
    try {
      new URL(settings.apiUrl)
    } catch (e) {
      errors.push('API地址格式不正确，请输入有效的URL')
    }
  }
  
  // 验证模型名称
  if (!settings.modelName.trim()) {
    errors.push('模型名称不能为空')
  }
  
  // 验证温度值
  if (settings.temperature < 0 || settings.temperature > 2) {
    errors.push('温度值必须在0-2之间')
  }
  
  // 验证最大令牌数
  if (settings.maxTokens < 100 || settings.maxTokens > 8000) {
    errors.push('最大令牌数必须在100-8000之间')
  }
  
  // 验证System Prompt
  if (!settings.systemPrompt.trim()) {
    errors.push('System Prompt不能为空')
  }
  
  // User Prompt可以为空，不需要验证
  
  return errors
}

/**
 * 保存设置到本地存储
 */
const saveSettings = () => {
  // 先验证设置
  const errors = validateSettings()
  if (errors.length > 0) {
    const u = (typeof window !== 'undefined' ? (window as any).utools : undefined)
    const errorMsg = '设置验证失败：\n' + errors.join('\n')
    if (u && typeof u.showNotification === 'function') {
      u.showNotification(errorMsg)
    } else {
      alert(errorMsg)
    }
    return
  }
  
  try {
    const u = (typeof window !== 'undefined' ? (window as any).utools : undefined)
    if (u && typeof u.dbStorage === 'object') {
      // 使用uTools的数据存储
      u.dbStorage.setItem('ai_translate_settings', JSON.stringify({
        apiUrl: settings.apiUrl,
        modelName: settings.modelName,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        systemPrompt: settings.systemPrompt,
        userPrompt: settings.userPrompt
      }))
      if (typeof u.showNotification === 'function') {
        u.showNotification('设置已保存')
      }
    } else {
      // 降级到localStorage
      localStorage.setItem('ai_translate_settings', JSON.stringify({
        apiUrl: settings.apiUrl,
        modelName: settings.modelName,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        systemPrompt: settings.systemPrompt,
        userPrompt: settings.userPrompt
      }))
      console.log('设置已保存到localStorage')
    }
  } catch (error) {
    console.error('保存设置失败:', error)
    const u = (typeof window !== 'undefined' ? (window as any).utools : undefined)
    if (u && typeof u.showNotification === 'function') {
      u.showNotification('保存设置失败')
    }
  }
}

/**
 * 从本地存储加载设置
 */
const loadSettings = () => {
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
      settings.apiUrl = savedSettings.apiUrl || settings.apiUrl
      settings.modelName = savedSettings.modelName || settings.modelName
      settings.temperature = savedSettings.temperature || settings.temperature
      settings.maxTokens = savedSettings.maxTokens || settings.maxTokens
      settings.systemPrompt = savedSettings.systemPrompt || settings.systemPrompt
      settings.userPrompt = savedSettings.userPrompt || settings.userPrompt
      console.log('设置已加载:', savedSettings)
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

/**
 * 测试AI服务连接
 */
const testConnection = async () => {
  if (!settings.apiUrl.trim()) {
    settings.testResult = '请输入API地址'
    return
  }
  
  settings.isLoading = true
  settings.testResult = ''
  
  try {
    const svc = (typeof window !== 'undefined' ? (window as any).services : undefined)
    if (!svc || typeof svc.httpRequest !== 'function') {
      throw new Error('网络请求服务不可用')
    }
    
    console.log('测试连接到:', settings.apiUrl)
    
    const response = await svc.httpRequest(settings.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.modelName || 'test-model',
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        temperature: settings.temperature,
        max_tokens: 100
      })
    })
    
    console.log('测试响应:', response)
    
    if (response.status === 200) {
      const data = response.json()
      if (data.choices && data.choices.length > 0) {
        settings.testResult = '✅ 连接成功！AI服务正常工作'
      } else {
        settings.testResult = '⚠️ 连接成功，但响应格式异常'
      }
    } else {
      const errorData = response.data
      let errorMsg = `❌ 连接失败 (${response.status})`
      try {
        const parsed = JSON.parse(errorData)
        if (parsed.error && parsed.error.message) {
          errorMsg += `\n错误信息: ${parsed.error.message}`
        }
      } catch (e) {
        errorMsg += `\n响应: ${errorData}`
      }
      settings.testResult = errorMsg
    }
  } catch (error) {
    console.error('测试连接失败:', error)
    settings.testResult = `❌ 连接失败\n错误: ${(error as any).message || String(error)}`
  } finally {
    settings.isLoading = false
  }
}

/**
 * 重置为默认设置
 */
const resetSettings = () => {
  settings.apiUrl = 'http://localhost:1234/v1/chat/completions'
  settings.modelName = ''
  settings.temperature = 0.3
  settings.maxTokens = 2000
  settings.systemPrompt = `You are a professional {{to}} native translator who needs to fluently translate text into {{to}}.

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
Direct translation without separators`
  settings.userPrompt = ''
  settings.testResult = ''
}

/**
 * 返回翻译界面
 */
const backToTranslate = () => {
  emit('back-to-translate')
}

/**
 * 组件挂载时加载设置
 */
onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="settings-container">
    <div class="settings-header">
      <button @click="backToTranslate" class="back-btn">← 返回翻译</button>
      <h2>AI翻译设置</h2>
    </div>

    <div class="settings-content">
      <div class="settings-section">
        <h3>API服务配置</h3>
        
        <div class="form-group">
          <label for="apiUrl">API地址:</label>
          <input 
            id="apiUrl"
            v-model="settings.apiUrl" 
            type="text" 
            placeholder="http://localhost:1234/v1/chat/completions"
            class="form-input"
          />
          <small class="form-hint">LM Studio或其他兼容OpenAI API的服务地址</small>
        </div>

        <div class="form-group">
          <label for="modelName">模型名称:</label>
          <input 
            id="modelName"
            v-model="settings.modelName" 
            type="text" 
            placeholder="例如: llama-2-7b-chat"
            class="form-input"
          />
          <small class="form-hint">在LM Studio中加载的模型名称，留空则使用默认模型</small>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="temperature">温度 (Temperature):</label>
            <input 
              id="temperature"
              v-model.number="settings.temperature" 
              type="number" 
              min="0" 
              max="2" 
              step="0.1"
              class="form-input"
            />
            <small class="form-hint">0-2，越低越保守</small>
          </div>

          <div class="form-group">
            <label for="maxTokens">最大令牌数:</label>
            <input 
              id="maxTokens"
              v-model.number="settings.maxTokens" 
              type="number" 
              min="100" 
              max="8000" 
              step="100"
              class="form-input"
            />
            <small class="form-hint">生成文本的最大长度</small>
          </div>
        </div>

        <div class="form-group">
          <label for="systemPrompt">System Prompt:</label>
          <textarea 
            id="systemPrompt"
            v-model="settings.systemPrompt" 
            placeholder="系统提示词，定义AI的角色和行为规则"
            class="form-textarea"
            rows="12"
          ></textarea>
          <small class="form-hint">系统提示词，包含变量：{{to}}, {{title_prompt}}, {{summary_prompt}}, {{terms_prompt}}</small>
        </div>

        <div class="form-group">
          <label for="userPrompt">User Prompt:</label>
          <textarea 
            id="userPrompt"
            v-model="settings.userPrompt" 
            placeholder="用户提示词，可选的额外指令"
            class="form-textarea"
            rows="4"
          ></textarea>
          <small class="form-hint">用户提示词，可以为空或添加额外的翻译指令</small>
        </div>
      </div>

      <div class="settings-section">
        <h3>连接测试</h3>
        <div class="test-section">
          <button 
            @click="testConnection" 
            :disabled="settings.isLoading" 
            class="test-btn"
          >
            {{ settings.isLoading ? '测试中...' : '测试连接' }}
          </button>
          
          <div v-if="settings.testResult" class="test-result">
            <pre>{{ settings.testResult }}</pre>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>提示词预览</h3>
        <div class="preview-section">
          <div class="form-group">
            <label>预览语言:</label>
            <select v-model="previewLang" class="form-input" style="width: 200px;">
              <option value="zh">中文</option>
              <option value="en">英语</option>
              <option value="ja">日语</option>
              <option value="ko">韩语</option>
              <option value="fr">法语</option>
              <option value="de">德语</option>
              <option value="es">西班牙语</option>
              <option value="ru">俄语</option>
            </select>
          </div>
          <div class="form-group">
            <label>处理后的System Prompt:</label>
            <textarea 
              :value="processedSystemPrompt" 
              readonly 
              class="form-textarea preview-textarea"
              rows="8"
            ></textarea>
          </div>
          <div class="form-group">
            <label>处理后的User Prompt:</label>
            <textarea 
              :value="processedUserPrompt" 
              readonly 
              class="form-textarea preview-textarea"
              rows="4"
            ></textarea>
            <div class="form-hint">示例文本: "Hello, how are you today?"</div>
          </div>
        </div>
      </div>

      <div class="settings-actions">
        <button @click="saveSettings" class="save-btn">保存设置</button>
        <button @click="resetSettings" class="reset-btn">重置默认</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:root {
  --primary-color: #1890ff;
  --primary-hover: #40a9ff;
  --success-color: #52c41a;
  --success-hover: #73d13d;
  --bg-white: #ffffff;
  --bg-gray: #f8f9fa;
  --bg-hover: #f0f0f0;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-disabled: #999999;
  --border-color: #d9d9d9;
  --shadow-light: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.15);
  --radius-small: 6px;
  --radius-medium: 12px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.settings-container {
  width: 100%;
  height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  overflow-y: auto;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 4px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: var(--radius-small);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  transition: var(--transition);
  min-height: 36px;
  box-shadow: var(--shadow-light);
}

.back-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: var(--shadow-medium);
}

.settings-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-section {
  background: var(--bg-white);
  border-radius: var(--radius-medium);
  padding: 24px;
  box-shadow: var(--shadow-medium);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.settings-section h3 {
  margin: 0 0 20px 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
  border-bottom: 2px solid var(--bg-gray);
  padding-bottom: 8px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-small);
  font-size: 14px;
  box-sizing: border-box;
  transition: var(--transition);
  min-height: 40px;
  background: var(--bg-white);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-textarea {
  width: 100%;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-small);
  font-size: 14px;
  box-sizing: border-box;
  resize: vertical;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
  transition: var(--transition);
  background: var(--bg-white);
}

.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.preview-textarea {
  background-color: var(--bg-gray);
  color: var(--text-secondary);
  cursor: default;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.test-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.test-btn {
  background: linear-gradient(135deg, var(--success-color), var(--success-hover));
  color: var(--bg-white);
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-small);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  align-self: flex-start;
  transition: var(--transition);
  min-height: 40px;
  box-shadow: var(--shadow-light);
}

.test-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.test-btn:active:not(:disabled) {
  transform: translateY(0);
}

.test-btn:disabled {
  background: var(--bg-hover);
  color: var(--text-disabled);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.test-result {
  background: var(--bg-gray);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-small);
  padding: 16px;
  border-left: 4px solid var(--primary-color);
}

.test-result pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--text-primary);
  line-height: 1.5;
}

.settings-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 24px;
  background: var(--bg-white);
  border-radius: var(--radius-medium);
  box-shadow: var(--shadow-medium);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.save-btn {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: var(--bg-white);
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-small);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: var(--transition);
  min-height: 40px;
  box-shadow: var(--shadow-light);
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.save-btn:active {
  transform: translateY(0);
}

.reset-btn {
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  padding: 12px 24px;
  border-radius: var(--radius-small);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  transition: var(--transition);
  min-height: 40px;
}

.reset-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: var(--shadow-light);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .settings-container {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%);
  }
  
  .settings-header h2 {
    color: #ffffff;
    -webkit-text-fill-color: #ffffff;
  }
  
  .settings-section {
    background: rgba(45, 55, 72, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .settings-section h3 {
    color: #ffffff;
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  
  .form-group label {
    color: #ffffff;
  }
  
  .form-input, .form-textarea {
    background: rgba(26, 32, 44, 0.6);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .preview-textarea {
    background: rgba(26, 32, 44, 0.4);
    color: #a0aec0;
  }
  
  .form-hint {
    color: #a0aec0;
  }
  
  .test-result {
    background: rgba(26, 32, 44, 0.6);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .test-result pre {
    color: #ffffff;
  }
  
  .settings-actions {
    background: rgba(45, 55, 72, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .back-btn, .reset-btn {
    background: rgba(45, 55, 72, 0.8);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }
}
</style>