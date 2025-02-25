import { app, BrowserWindow, screen, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createTray, destroyTray } from './tray'
import fs from 'fs/promises'
import Store from 'electron-store'

const store = new Store()
createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'rabbit.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    width: 180,
    height: 200,
    x: screenWidth - 200, // 设置窗口x坐标
    y: screenHeight - 220, // 设置窗口y坐标
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // 添加以下代码以确保窗口完全透明
  win.setBackgroundColor('#00000000')

  win.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  })

  // win.webContents.openDevTools({ mode: 'detach' })
}

const subWindows = new Map<string, BrowserWindow>()

// 创建子窗口
function createSubWindow(windowId: string, title: string) {
  // 检查窗口是否已存在
  if (subWindows.has(windowId)) {
    // 如果存在，但是被小化了，要恢复
    if (subWindows.get(windowId)?.isMinimized()) {
      subWindows.get(windowId)?.restore()
    }
    subWindows.get(windowId)?.focus()
    return
  }

  const subWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 500,
    minHeight: 400,
    title: title,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    subWindow.loadURL(VITE_DEV_SERVER_URL + '/#' + windowId)
  } else {
    // win.loadFile('dist/index.html')
    subWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      hash: windowId,
    })
  }

  // 窗口准备好后显示
  subWindow.once('ready-to-show', () => {
    subWindow.show()
    subWindow.focus()
  })

  subWindow.on('close', () => {
    // 通知渲染进程关闭编辑窗口
    if (windowId === 'pet') {
      win?.webContents.send('close-edit-window')
    }
  })

  // 窗口关闭时从Map中删除
  subWindow.on('closed', () => {
    subWindows.delete(windowId)
  })

  subWindows.set(windowId, subWindow)

  // 在页面加载完成后设置标题
  subWindow.webContents.on('did-finish-load', () => {
    subWindow.setTitle(title)
  })

  // 在页面DOM更新后也设置标题
  subWindow.webContents.on('dom-ready', () => {
    subWindow.setTitle(title)
  })

  // 打开调试
  // subWindow.webContents.openDevTools({ mode: 'detach' })
}

let reminderWindow: BrowserWindow | null = null

function createReminderWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize

  // 获取实时的主窗口位置
  const mainWindowBounds = win?.getBounds() || {
    x: screenWidth - 200,
    y: screenHeight - 150,
  }

  reminderWindow = new BrowserWindow({
    width: 180,
    height: 150,
    x: mainWindowBounds.x,
    y: mainWindowBounds.y - 210, // 在主窗口上方150像素
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    show: false, // 初始时不显示窗口
  })

  // 添加以下代码以确保窗口完全透明
  reminderWindow.setBackgroundColor('#00000000')

  if (VITE_DEV_SERVER_URL) {
    reminderWindow.loadURL(VITE_DEV_SERVER_URL + '/#/reminder-popup')
  } else {
    reminderWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      hash: 'reminder-popup',
    })
  }

  // 添加 IPC 监听器来控制窗口显示状态
  ipcMain.on('show-reminder-window', async () => {
    // 如果窗口已经显示，则不处理
    if (reminderWindow?.isVisible()) {
      return
    }
    // 如果主窗口被最小化
    if (win !== null && win !== undefined) {
      win.restore()
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
    reminderWindow?.show()
    // 显示窗口后，发送数据到提醒窗口
    reminderWindow?.webContents.send('update-reminders')
  })

  ipcMain.on('hide-reminder-window', () => {
    reminderWindow?.hide()
  })
  // reminderWindow?.webContents.openDevTools();
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray()
    app.quit()
    subWindows.forEach((window) => {
      window.close()
    })
    win = null
    reminderWindow = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createReminderWindow()
  createWindow()
  createTray(() => {
    destroyTray()
    app.quit()
    subWindows.forEach((window) => {
      window.close()
    })
    win = null
    reminderWindow = null
  })

  ipcMain.on('exit-app', () => {
    destroyTray()
    app.quit()
    subWindows.forEach((window) => {
      window.close()
    })
    win = null
    reminderWindow = null
  })

  // 主窗口最小化
  ipcMain.on('minimize-main-window', () => {
    if (win !== null && win !== undefined) {
      win.minimize()
    }
  })

  ipcMain.on('open-sub-window', (_event, { windowId, title }) => {
    createSubWindow(windowId, title)
  })

  ipcMain.handle('get-model-list', async () => {
    const modelsDir = path.join(process.env.VITE_PUBLIC)

    try {
      await fs.access(modelsDir)
    } catch {
      await fs.mkdir(modelsDir, { recursive: true })
    }

    const files = await fs.readdir(modelsDir)
    return files
      .filter((file) => file.endsWith('.glb'))
      .map((file) => ({
        name: path.parse(file).name,
        path: `${file}`,
      }))
  })

  ipcMain.handle('upload-model', async (_, { name, path: filePath }) => {
    const targetPath = path.join(process.env.VITE_PUBLIC, name)
    await fs.copyFile(filePath, targetPath)
    return { success: true }
  })

  ipcMain.handle('save-settings', (_, settings) => {
    store.set('settings', settings)
  })

  ipcMain.handle('get-settings', () => {
    return store.get('settings')
  })

  // 清空配置
  ipcMain.handle('clear-settings', () => {
    store.clear()
  })

  ipcMain.on('update-model-url', (_event, newUrl) => {
    win?.webContents.send('model-url-changed', newUrl)
    // 广播给所有窗口
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('model-url-changed', newUrl)
      }
    })
  })

  ipcMain.on('update-scene-settings', (_event, settings) => {
    // 广播给所有窗口
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('scene-settings-changed', settings)
      }
    })
  })

  ipcMain.on('update-model-actions', (_event, actions) => {
    // 广播给所有窗口
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('model-actions-changed', actions)
      }
    })
  })

  ipcMain.on('update-model-action-loop', (_event, action) => {
    // 广播给所有窗口
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('model-action-loop-changed', action)
      }
    })
  })

  ipcMain.on('update-model-action-click', (_event, action) => {
    // 广播给所有窗口
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('model-action-click-changed', action)
      }
    })
  })

  // 重启应用
  ipcMain.handle('restart-app', () => {
    if (VITE_DEV_SERVER_URL) {
      // 开发环境下，只重新加载窗口
      win?.reload()
      reminderWindow?.reload()
      subWindows.forEach((window) => {
        window.close()
      })
    } else {
      // 生产环境下，重启整个应用
      app.relaunch()
      destroyTray()
      app.quit()
    }
  })
})
