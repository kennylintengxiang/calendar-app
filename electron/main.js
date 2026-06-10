/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow = null
let serverProcess = null
const SERVER_PORT = 17432 // 使用不常见的端口避免冲突

/**
 * 获取应用数据目录（数据库文件存放位置）
 * Windows: %APPDATA%/calendar-app
 * macOS: ~/Library/Application Support/calendar-app
 */
function getAppDataDir() {
  return app.getPath('userData')
}

/**
 * 获取 SQLite 数据库文件路径
 */
function getDatabasePath() {
  return path.join(getAppDataDir(), 'calendar.db')
}

/**
 * 启动 Next.js standalone 服务器
 */
function startServer() {
  return new Promise((resolve, reject) => {
    const isDev = !app.isPackaged

    if (isDev) {
      // 开发模式：直接使用 next dev
      const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', 'next')
      serverProcess = spawn(nextBin, ['dev', '-p', String(SERVER_PORT)], {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          DATABASE_URL: `file:${getDatabasePath()}`,
          ELECTRON: 'true',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } else {
      // 生产模式：运行 standalone 服务器
      const serverPath = path.join(process.resourcesPath, 'standalone')
      const serverScript = path.join(serverPath, 'server.js')

      serverProcess = spawn(process.execPath, [serverScript], {
        cwd: serverPath,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: String(SERVER_PORT),
          HOSTNAME: '127.0.0.1',
          DATABASE_URL: `file:${getDatabasePath()}`,
          ELECTRON: 'true',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    }

    let resolved = false

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('[Server]', output.trim())
      // 检测服务器是否启动完成
      if (!resolved && (output.includes('Ready') || output.includes('Local:'))) {
        resolved = true
        resolve()
      }
    })

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString()
      console.error('[Server Error]', output.trim())
      if (!resolved && (output.includes('Ready') || output.includes('Local:'))) {
        resolved = true
        resolve()
      }
    })

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err)
      if (!resolved) {
        resolved = true
        reject(err)
      }
    })

    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`)
      serverProcess = null
    })

    // 超时保底：5秒后如果还没检测到 Ready，也尝试打开窗口
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }, 5000)
  })
}

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: '财务日历',
    icon: path.join(__dirname, '..', 'public', 'logo.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 加载应用
  mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`)

  // 开发模式打开 DevTools
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  // 外部链接用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 自定义菜单
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '刷新', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow?.reload() },
        { label: '开发者工具', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: '重置缩放', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '数据目录',
          click: () => shell.openPath(getAppDataDir()),
        },
        { type: 'separator' },
        { label: '关于', click: () => {
          const { dialog } = require('electron')
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '关于 财务日历',
            message: '财务日历',
            detail: '版本: 1.0.0\n\n一款多主体财务日历管理工具\n\n数据存储位置:\n' + getDatabasePath(),
          })
        }},
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// 应用就绪
app.whenReady().then(async () => {
  console.log('正在启动日历服务...')
  console.log('数据库路径:', getDatabasePath())

  try {
    await startServer()
    console.log('日历服务启动成功')
  } catch (err) {
    console.error('日历服务启动失败:', err)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 退出前清理
app.on('before-quit', () => {
  if (serverProcess) {
    console.log('正在关闭日历服务...')
    serverProcess.kill()
    serverProcess = null
  }
})

// 防止多实例
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
