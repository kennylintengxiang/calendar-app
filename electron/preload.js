/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge } = require('electron')

// 向渲染进程暴露安全的 API
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
})
