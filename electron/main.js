/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, Menu, shell, dialog } = require('electron')
const path = require('path')
const { spawn, fork } = require('child_process')
const fs = require('fs')

let mainWindow = null
let serverProcess = null
const SERVER_PORT = 17432

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
 * 写日志到文件，方便排查问题
 */
function log(msg) {
  const logPath = path.join(getAppDataDir(), 'app.log')
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${msg}\n`
  console.log(line.trim())
  try {
    const dir = path.dirname(logPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(logPath, line)
  } catch {}
}

/**
 * 初始化数据库
 *
 * 数据库表结构已改为在 Next.js 服务器进程内自动创建（db.ts 中使用 CREATE TABLE IF NOT EXISTS）。
 * 这里只做日志提示和目录创建。
 *
 * 同时设置 PRISMA_QUERY_ENGINE_BINARY 环境变量，
 * 确保 Prisma 能找到正确的引擎二进制文件。
 */
function initDatabase() {
  const dbPath = getDatabasePath()
  log(`数据库路径: ${dbPath}`)

  // 确保数据库目录存在
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
    log(`创建数据库目录: ${dbDir}`)
  }

  // 设置 Prisma 引擎路径（让 Prisma 知道去哪里找 query engine 二进制文件）
  const isDev = !app.isPackaged
  let prismaEnginePath

  if (isDev) {
    // 开发模式：使用项目本地的引擎
    prismaEnginePath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'query-engine-windows.exe')
    if (!fs.existsSync(prismaEnginePath)) {
      // Linux/macOS 开发环境
      prismaEnginePath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'query-engine-debian-openssl-3.0.x')
    }
    if (!fs.existsSync(prismaEnginePath)) {
      prismaEnginePath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'query-engine-linux-musl')
    }
  } else {
    // 生产模式：使用 standalone 目录下的引擎
    const serverPath = path.join(process.resourcesPath, 'standalone')
    prismaEnginePath = path.join(serverPath, 'node_modules', '.prisma', 'client', 'query-engine-windows.exe')
  }

  if (prismaEnginePath && fs.existsSync(prismaEnginePath)) {
    process.env.PRISMA_QUERY_ENGINE_BINARY = prismaEnginePath
    log(`Prisma 引擎路径: ${prismaEnginePath}`)
    log(`Prisma 引擎文件大小: ${fs.statSync(prismaEnginePath).size} bytes`)
  } else {
    log(`⚠️ 未找到 Prisma 引擎: ${prismaEnginePath}`)

    // 尝试在更多位置搜索引擎
    const searchPaths = isDev ? [
      path.join(__dirname, '..', 'node_modules', '.prisma', 'client'),
    ] : [
      path.join(process.resourcesPath, 'standalone', 'node_modules', '.prisma', 'client'),
      path.join(process.resourcesPath, 'standalone', 'node_modules', '@prisma', 'client'),
    ]

    for (const searchDir of searchPaths) {
      log(`搜索目录: ${searchDir}`)
      try {
        if (fs.existsSync(searchDir)) {
          const files = fs.readdirSync(searchDir).filter(f => f.startsWith('query-engine') || f.startsWith('libquery_engine'))
          log(`  找到引擎文件: ${files.join(', ')}`)
          // 如果找到任何 query-engine 文件，使用第一个
          const winEngine = files.find(f => f.includes('windows'))
          if (winEngine) {
            prismaEnginePath = path.join(searchDir, winEngine)
            process.env.PRISMA_QUERY_ENGINE_BINARY = prismaEnginePath
            log(`✅ 使用找到的引擎: ${prismaEnginePath}`)
            break
          }
        } else {
          log(`  目录不存在`)
        }
      } catch (e) {
        log(`  搜索失败: ${e.message}`)
      }
    }

    if (!process.env.PRISMA_QUERY_ENGINE_BINARY) {
      log(`❌ 无法找到任何可用的 Prisma 引擎！数据库功能将无法使用。`)
    }
  }

  log('数据库表结构将在 Next.js 服务器启动时自动创建')
  return Promise.resolve(true)
}

/**
 * 启动 Next.js standalone 服务器
 */
function startServer() {
  return new Promise((resolve, reject) => {
    const dbPath = getDatabasePath()
    const dbDir = path.dirname(dbPath)

    // 确保数据库目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
      log(`创建数据库目录: ${dbDir}`)
    }

    const isDev = !app.isPackaged

    if (isDev) {
      // 开发模式：直接使用 next dev
      log(`开发模式启动`)
      const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', 'next')
      serverProcess = spawn(nextBin, ['dev', '-p', String(SERVER_PORT)], {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          DATABASE_URL: `file:${dbPath}`,
          ELECTRON: 'true',
          // 确保 Prisma 引擎路径传递给子进程
          PRISMA_QUERY_ENGINE_BINARY: process.env.PRISMA_QUERY_ENGINE_BINARY || '',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      })
    } else {
      // 生产模式：运行 standalone 服务器
      const serverPath = path.join(process.resourcesPath, 'standalone')
      const serverScript = path.join(serverPath, 'server.js')

      log(`生产模式启动`)
      log(`资源路径: ${process.resourcesPath}`)
      log(`服务器路径: ${serverPath}`)
      log(`服务器脚本: ${serverScript}`)
      log(`脚本存在: ${fs.existsSync(serverScript)}`)
      log(`数据库路径: ${dbPath}`)

      // 列出 serverPath 目录内容
      try {
        const files = fs.readdirSync(serverPath)
        log(`standalone 目录内容: ${files.join(', ')}`)
      } catch (e) {
        log(`读取 standalone 目录失败: ${e.message}`)
      }

      if (!fs.existsSync(serverScript)) {
        const errMsg = `server.js 不存在: ${serverScript}`
        log(errMsg)
        reject(new Error(errMsg))
        return
      }

      // 使用 fork 运行 server.js
      // fork 会使用 Electron 内置的 Node.js 来执行脚本
      const serverEnv = {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(SERVER_PORT),
        HOSTNAME: '127.0.0.1',
        DATABASE_URL: `file:${dbPath}`,
        ELECTRON: 'true',
        // 确保 Prisma 引擎路径传递给子进程
        PRISMA_QUERY_ENGINE_BINARY: process.env.PRISMA_QUERY_ENGINE_BINARY || '',
      }

      log(`启动服务器，环境变量: PORT=${SERVER_PORT}, DATABASE_URL=file:${dbPath}`)

      // 使用 fork 而不是 spawn，fork 适合运行 Node.js 脚本
      serverProcess = fork(serverScript, [], {
        cwd: serverPath,
        env: serverEnv,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        silent: true,
      })
    }

    let resolved = false

    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      log(`[Server stdout] ${output.trim()}`)
      if (!resolved && (output.includes('Ready') || output.includes('Local:') || output.includes('listening'))) {
        resolved = true
        resolve()
      }
    })

    serverProcess.stderr?.on('data', (data) => {
      const output = data.toString()
      log(`[Server stderr] ${output.trim()}`)
      if (!resolved && (output.includes('Ready') || output.includes('Local:') || output.includes('listening'))) {
        resolved = true
        resolve()
      }
    })

    serverProcess.on('error', (err) => {
      log(`服务器启动失败: ${err.message}`)
      if (!resolved) {
        resolved = true
        reject(err)
      }
    })

    serverProcess.on('close', (code) => {
      log(`服务器进程退出，代码: ${code}`)
      serverProcess = null
    })

    // 超时保底：8秒后如果还没检测到 Ready，也尝试打开窗口
    setTimeout(() => {
      if (!resolved) {
        log('等待服务器启动超时，继续打开窗口')
        resolved = true
        resolve()
      }
    }, 8000)
  })
}

/**
 * 等待服务器可用（重试机制）
 */
function waitForServer(maxRetries = 30) {
  return new Promise((resolve) => {
    const http = require('http')
    let retries = 0

    function tryConnect() {
      const req = http.get(`http://127.0.0.1:${SERVER_PORT}`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 302) {
          log('服务器连接成功')
          resolve(true)
        } else {
          log(`服务器返回状态码: ${res.statusCode}`)
          resolve(true) // 即使不是200也继续，可能是重定向
        }
      })

      req.on('error', () => {
        retries++
        if (retries < maxRetries) {
          setTimeout(tryConnect, 500)
        } else {
          log('服务器连接超时')
          resolve(false)
        }
      })

      req.setTimeout(2000, () => {
        req.destroy()
        retries++
        if (retries < maxRetries) {
          setTimeout(tryConnect, 500)
        } else {
          resolve(false)
        }
      })
    }

    tryConnect()
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
    show: false, // 先不显示，等页面加载好再显示
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 页面加载好后再显示窗口，避免白屏闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 加载应用
  mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`)

  // 加载失败时显示错误信息
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
    log(`页面加载失败: ${errorCode} - ${errorDesc}`)
    mainWindow?.show()
  })

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
        {
          label: '查看日志',
          click: () => {
            const logPath = path.join(getAppDataDir(), 'app.log')
            if (fs.existsSync(logPath)) {
              shell.openPath(logPath)
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '日志',
                message: '暂无日志文件',
              })
            }
          },
        },
        { type: 'separator' },
        { label: '关于', click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '关于 财务日历',
            message: '财务日历',
            detail: '版本: 1.0.0\n\n一款多主体财务日历管理工具\n\n数据存储位置:\n' + getDatabasePath() + '\n\n日志文件:\n' + path.join(getAppDataDir(), 'app.log'),
          })
        }},
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// 应用就绪
app.whenReady().then(async () => {
  log('========== 应用启动 ==========')
  log(`数据库路径: ${getDatabasePath()}`)
  log(`应用路径: ${app.getAppPath()}`)
  log(`是否打包: ${!app.isPackaged ? '否(开发)' : '是(生产)'}`)

  try {
    // 在启动服务器前，先初始化数据库（创建表结构）
    // Prisma 不会自动创建 SQLite 表，必须先运行 prisma db push
    log('正在初始化数据库...')
    await initDatabase()
    log('数据库初始化步骤完成，启动服务器...')

    await startServer()
    log('服务器启动完成，等待连接...')

    // 等待服务器可以响应 HTTP 请求
    const serverReady = await waitForServer()
    if (serverReady) {
      log('服务器已就绪')
    } else {
      log('服务器未就绪，仍尝试打开窗口')
    }
  } catch (err) {
    log(`服务器启动失败: ${err.message}`)
    dialog.showErrorBox('启动失败', `日历服务启动失败:\n${err.message}\n\n日志文件:\n${path.join(getAppDataDir(), 'app.log')}`)
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
    log('正在关闭日历服务...')
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
