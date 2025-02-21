import { app, BrowserWindow, ipcMain, screen } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "rabbit.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    },
    width: 180,
    height: 200,
    x: screenWidth - 200,
    // 设置窗口x坐标
    y: screenHeight - 150,
    // 设置窗口y坐标
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  win.setBackgroundColor("#00000000");
  win.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true
  });
}
const subWindows = /* @__PURE__ */ new Map();
function createSubWindow(windowId, title) {
  var _a, _b, _c;
  if (subWindows.has(windowId)) {
    if ((_a = subWindows.get(windowId)) == null ? void 0 : _a.isMinimized()) {
      (_b = subWindows.get(windowId)) == null ? void 0 : _b.restore();
    }
    (_c = subWindows.get(windowId)) == null ? void 0 : _c.focus();
    return;
  }
  const subWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 500,
    minHeight: 400,
    title,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    }
  });
  if (VITE_DEV_SERVER_URL) {
    subWindow.loadURL(VITE_DEV_SERVER_URL + "/#" + windowId);
  } else {
    subWindow.loadFile(path.join(RENDERER_DIST, "index.html"), {
      hash: windowId
    });
  }
  subWindow.once("ready-to-show", () => {
    subWindow.show();
    subWindow.focus();
  });
  subWindow.on("closed", () => {
    subWindows.delete(windowId);
  });
  subWindows.set(windowId, subWindow);
  subWindow.webContents.on("did-finish-load", () => {
    subWindow.setTitle(title);
  });
  subWindow.webContents.on("dom-ready", () => {
    subWindow.setTitle(title);
  });
}
let reminderWindow = null;
function createReminderWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const mainWindowBounds = win == null ? void 0 : win.getBounds();
  reminderWindow = new BrowserWindow({
    width: 180,
    height: 150,
    x: (mainWindowBounds == null ? void 0 : mainWindowBounds.x) || screenWidth - 200,
    y: ((mainWindowBounds == null ? void 0 : mainWindowBounds.y) || screenHeight - 150) - 150,
    // 在主窗口上方150像素
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    },
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    show: false
    // 初始时不显示窗口
  });
  reminderWindow.setBackgroundColor("#00000000");
  if (VITE_DEV_SERVER_URL) {
    reminderWindow.loadURL(VITE_DEV_SERVER_URL + "/#/reminder-popup");
  } else {
    reminderWindow.loadFile(path.join(RENDERER_DIST, "index.html"), {
      hash: "reminder-popup"
    });
  }
  win == null ? void 0 : win.on("move", () => {
    if (reminderWindow && win) {
      const bounds = win.getBounds();
      reminderWindow.setPosition(bounds.x, bounds.y - 150);
    }
  });
  ipcMain.on("show-reminder-window", () => {
    if (reminderWindow == null ? void 0 : reminderWindow.isVisible()) {
      return;
    }
    reminderWindow == null ? void 0 : reminderWindow.show();
    reminderWindow == null ? void 0 : reminderWindow.webContents.send("update-reminders");
  });
  ipcMain.on("hide-reminder-window", () => {
    reminderWindow == null ? void 0 : reminderWindow.hide();
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    subWindows.forEach((window) => {
      window.close();
    });
    win = null;
    reminderWindow = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  createReminderWindow();
  createWindow();
  ipcMain.on("exit-app", () => {
    app.quit();
    subWindows.forEach((window) => {
      window.close();
    });
    win = null;
    reminderWindow = null;
  });
  ipcMain.on("open-sub-window", (_event, { windowId, title }) => {
    createSubWindow(windowId, title);
  });
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
