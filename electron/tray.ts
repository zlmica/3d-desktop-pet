import { app, Tray, Menu, nativeImage } from 'electron'
import path from 'node:path'

let tray: Tray | null = null

export function createTray(callback: () => void) {
  // 创建托盘图标
  const icon = nativeImage.createFromPath(
    path.join(process.env.VITE_PUBLIC, 'rabbitRound.png')
  )
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '开机启动',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          path: process.execPath,
        })
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        callback()
      },
    },
  ])

  tray.setToolTip('小桌宠')
  tray.setContextMenu(contextMenu)
}

// 销毁托盘
export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
