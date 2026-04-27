import { app, BrowserWindow, WebContentsView, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { runSubmission } from './automation/submissionAgent.js'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// Disable hardware acceleration and GPU compositing entirely to fix GPU process crash on Linux/Haswell
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('disable-gpu-rasterization')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('no-sandbox')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
// Track the active embedded WebContentsView (venue portal)
let embeddedView: WebContentsView | null = null

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

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
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

  // ─── Legacy: Playwright submission IPC ───────────────────────────────────
  ipcMain.on('start-submission', async (event, data) => {
    console.log('[Main] Received start-submission request:', data.paper?.title)

    const mainWindow = BrowserWindow.fromWebContents(event.sender)
    const contentBounds = mainWindow?.getContentBounds() || { x: 0, y: 0, width: 1280, height: 800 }

    if (data.bounds) {
      data.absoluteBounds = {
        x: Math.round(contentBounds.x + data.bounds.x),
        y: Math.round(contentBounds.y + data.bounds.y),
        width: Math.round(data.bounds.width),
        height: Math.round(data.bounds.height),
      }
    }

    await runSubmission(data, (progressMsg: any) => {
      event.sender.send('submission-progress', progressMsg)
    })
  })

  // ─── WebContentsView: Embed venue portal inside the app window ───────────
  /**
   * embed-webcontents: Load a venue portal URL inside a WebContentsView
   * overlaid on the specified DOM bounds (sent from renderer via getBoundingClientRect).
   * 
   * payload: { url: string, bounds: { x, y, width, height } }
   */
  ipcMain.on('embed-webcontents', (event, payload: { url: string; bounds: { x: number; y: number; width: number; height: number } }) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender)
    if (!mainWindow) return

    // Destroy any existing embedded view first
    if (embeddedView) {
      mainWindow.contentView.removeChildView(embeddedView)
      embeddedView.webContents.close()
      embeddedView = null
    }

    const contentBounds = mainWindow.getContentBounds()
    const { url, bounds } = payload

    // Convert renderer-relative bounds to window-absolute bounds
    const absoluteBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    }

    console.log(`[Main] Embedding WebContentsView at`, absoluteBounds, 'loading:', url)

    embeddedView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    mainWindow.contentView.addChildView(embeddedView)
    embeddedView.setBounds(absoluteBounds)
    embeddedView.webContents.loadURL(url)

    // Relay load status back to renderer
    embeddedView.webContents.on('did-finish-load', () => {
      event.sender.send('webcontents-status', { status: 'loaded', url: embeddedView?.webContents.getURL() })
    })
    embeddedView.webContents.on('did-fail-load', (_e, code, desc) => {
      event.sender.send('webcontents-status', { status: 'error', error: desc })
    })
  })

  /**
   * destroy-webcontents: Remove and destroy the embedded WebContentsView
   */
  ipcMain.on('destroy-webcontents', (event) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender)
    if (!mainWindow || !embeddedView) return

    mainWindow.contentView.removeChildView(embeddedView)
    embeddedView.webContents.close()
    embeddedView = null
    console.log('[Main] WebContentsView destroyed')
    event.sender.send('webcontents-status', { status: 'destroyed' })
  })

  /**
   * resize-webcontents: Update the embedded view bounds when the card resizes
   */
  ipcMain.on('resize-webcontents', (_event, bounds: { x: number; y: number; width: number; height: number }) => {
    if (embeddedView) {
      embeddedView.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      })
    }
  })
})
