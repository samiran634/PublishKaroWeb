import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { runSubmission } from './automation/submissionAgent.js'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'PublishKaro',
    icon: path.join(process.env.VITE_PUBLIC || '', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  
  // Register IPC handlers
  ipcMain.on('start-submission', async (event, data) => {
    console.log('[Main] Received start-submission request:', data.paper?.title);
    
    // Calculate absolute bounds for overlay
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    const contentBounds = mainWindow?.getContentBounds() || { x: 0, y: 0, width: 1280, height: 800 };
    
    // data.bounds holds the DOM getBoundingClientRect from the renderer
    if (data.bounds) {
        data.absoluteBounds = {
            x: Math.round(contentBounds.x + data.bounds.x),
            y: Math.round(contentBounds.y + data.bounds.y),
            width: Math.round(data.bounds.width),
            height: Math.round(data.bounds.height)
        };
    }

    // Call the local Playwright stealth agent
    await runSubmission(data, (progressMsg) => {
        event.sender.send('submission-progress', progressMsg);
    });
  })
})
