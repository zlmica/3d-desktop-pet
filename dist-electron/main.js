import { app as p, BrowserWindow as u, ipcMain as h, screen as g } from "electron";
import { createRequire as R } from "node:module";
import { fileURLToPath as w } from "node:url";
import n from "node:path";
R(import.meta.url);
const d = n.dirname(w(import.meta.url));
process.env.APP_ROOT = n.join(d, "..");
const l = process.env.VITE_DEV_SERVER_URL, O = n.join(process.env.APP_ROOT, "dist-electron"), f = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = l ? n.join(process.env.APP_ROOT, "public") : f;
let o;
function b() {
  const s = g.getPrimaryDisplay(), { width: r, height: t } = s.workAreaSize;
  o = new u({
    icon: n.join(process.env.VITE_PUBLIC, "rabbit.png"),
    webPreferences: {
      preload: n.join(d, "preload.mjs")
    },
    width: 180,
    height: 200,
    x: r - 200,
    // 设置窗口x坐标
    y: t - 150,
    // 设置窗口y坐标
    autoHideMenuBar: !0,
    transparent: !0,
    frame: !1,
    alwaysOnTop: !0,
    resizable: !1,
    hasShadow: !1
  }), o.webContents.on("did-finish-load", () => {
    o == null || o.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), l ? o.loadURL(l) : o.loadFile(n.join(f, "index.html")), o.setBackgroundColor("#00000000"), o.setVisibleOnAllWorkspaces(!0, {
    visibleOnFullScreen: !0
  });
}
const a = /* @__PURE__ */ new Map();
function y(s, r) {
  var i, c, m;
  if (a.has(s)) {
    (i = a.get(s)) != null && i.isMinimized() && ((c = a.get(s)) == null || c.restore()), (m = a.get(s)) == null || m.focus();
    return;
  }
  const t = new u({
    width: 800,
    height: 600,
    minWidth: 500,
    minHeight: 400,
    title: r,
    show: !1,
    webPreferences: {
      preload: n.join(d, "preload.mjs")
    }
  });
  l ? t.loadURL(l + "/#" + s) : t.loadFile(n.join(f, "index.html"), {
    hash: s
  }), t.once("ready-to-show", () => {
    t.show(), t.focus();
  }), t.on("closed", () => {
    a.delete(s);
  }), a.set(s, t), t.webContents.on("did-finish-load", () => {
    t.setTitle(r);
  }), t.webContents.on("dom-ready", () => {
    t.setTitle(r);
  });
}
let e = null;
function P() {
  const s = g.getPrimaryDisplay(), { width: r, height: t } = s.workAreaSize, i = o == null ? void 0 : o.getBounds();
  e = new u({
    width: 180,
    height: 150,
    x: (i == null ? void 0 : i.x) || r - 200,
    y: ((i == null ? void 0 : i.y) || t - 150) - 150,
    // 在主窗口上方150像素
    webPreferences: {
      preload: n.join(d, "preload.mjs")
    },
    autoHideMenuBar: !0,
    transparent: !0,
    frame: !1,
    alwaysOnTop: !0,
    resizable: !1,
    hasShadow: !1,
    show: !1
    // 初始时不显示窗口
  }), e.setBackgroundColor("#00000000"), l ? e.loadURL(l + "/#/reminder-popup") : e.loadFile(n.join(f, "index.html"), {
    hash: "reminder-popup"
  }), o == null || o.on("move", () => {
    if (e && o) {
      const c = o.getBounds();
      e.setPosition(c.x, c.y - 150);
    }
  }), h.on("show-reminder-window", () => {
    e != null && e.isVisible() || (e == null || e.show(), e == null || e.webContents.send("update-reminders"));
  }), h.on("hide-reminder-window", () => {
    e == null || e.hide();
  });
}
p.on("window-all-closed", () => {
  process.platform !== "darwin" && (p.quit(), a.forEach((s) => {
    s.close();
  }), o = null, e = null);
});
p.on("activate", () => {
  u.getAllWindows().length === 0 && b();
});
p.whenReady().then(() => {
  P(), b(), h.on("exit-app", () => {
    p.quit(), a.forEach((s) => {
      s.close();
    }), o = null, e = null;
  }), h.on("open-sub-window", (s, { windowId: r, title: t }) => {
    y(r, t);
  });
});
export {
  O as MAIN_DIST,
  f as RENDERER_DIST,
  l as VITE_DEV_SERVER_URL
};
