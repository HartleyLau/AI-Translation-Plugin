const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')
const http = require('node:http')

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 文本写入到下载目录
  writeTextFile (text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
  // 图片写入到下载目录
  writeImageFile (base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },
  // HTTP请求功能，用于调用本地大模型API
  httpRequest (url, options = {}) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https://')
      const client = isHttps ? https : http
      
      const requestOptions = {
        method: options.method || 'GET',
        headers: options.headers || {},
        ...options
      }
      
      const req = client.request(url, requestOptions, (res) => {
        let data = ''
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const response = {
              status: res.statusCode,
              headers: res.headers,
              data: data,
              json: () => JSON.parse(data)
            }
            resolve(response)
          } catch (error) {
            reject(new Error(`解析响应失败: ${error.message}`))
          }
        })
      })
      
      req.on('error', (error) => {
        reject(new Error(`请求失败: ${error.message}`))
      })
      
      if (options.body) {
        req.write(options.body)
      }
      
      req.end()
    })
  }
}
