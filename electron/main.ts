import { app, BrowserWindow, WebContentsView, dialog, ipcMain, type WebContents, webContents } from 'electron'
import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { runSubmission } from './automation/submissionAgent.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// Disable hardware acceleration to fix GPU process crash on Haswell/older hardware.
// NOTE: We keep disable-gpu-compositing OFF here because it breaks WebContentsView rendering.
// The GPU crash flags are passed to the Electron process via vite.config.mts startup args instead.
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('no-sandbox')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

function resolveWindowIcon() {
  const basePath = process.env.VITE_PUBLIC || ''
  const iconCandidates = [
    path.join(basePath, 'favicon.ico'),
    path.join(basePath, 'favicon.png'),
  ]

  return iconCandidates.find((candidate) => fs.existsSync(candidate))
}

let win: BrowserWindow | null
// Track the active embedded WebContentsView (venue portal)
let embeddedView: WebContentsView | null = null
let embeddedOwnerId: number | null = null

async function attachFileToPortalInput(
  targetContents: WebContents,
  filePath: string,
): Promise<{ success: boolean; reason?: string; fileName?: string }> {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      success: false,
      reason: 'The selected manuscript PDF could not be found on disk.',
    }
  }

  const selector = await targetContents.executeJavaScript(`
    (() => {
      const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && element.offsetParent !== null;
      };
      const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
      for (const input of inputs) {
        input.removeAttribute('data-publishkaro-upload-target');
      }
      const bestInput = inputs.find(isVisible) || inputs[0];
      if (!bestInput) return '';
      bestInput.setAttribute('data-publishkaro-upload-target', 'true');
      return 'input[data-publishkaro-upload-target="true"]';
    })();
  `, true) as string

  if (!selector) {
    return {
      success: false,
      reason: 'Could not find a file upload input on the current portal page.',
    }
  }

  const debuggerWasAttached = targetContents.debugger.isAttached()
  if (!debuggerWasAttached) {
    targetContents.debugger.attach('1.3')
  }

  try {
    const { root } = await targetContents.debugger.sendCommand('DOM.getDocument', { depth: -1, pierce: true })
    const { nodeId } = await targetContents.debugger.sendCommand('DOM.querySelector', {
      nodeId: root.nodeId,
      selector,
    })

    if (!nodeId) {
      return {
        success: false,
        reason: 'Could not target the manuscript upload input on the current portal page.',
      }
    }

    await targetContents.debugger.sendCommand('DOM.setFileInputFiles', {
      nodeId,
      files: [filePath],
    })

    await targetContents.executeJavaScript(`
      (() => {
        const input = document.querySelector('input[data-publishkaro-upload-target="true"]');
        if (!(input instanceof HTMLInputElement)) return '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return input.files?.[0]?.name || '';
      })();
    `, true)

    return {
      success: true,
      fileName: path.basename(filePath),
    }
  } catch (error: any) {
    return {
      success: false,
      reason: error.message ?? 'Could not attach the manuscript PDF to the portal upload field.',
    }
  } finally {
    if (!debuggerWasAttached && targetContents.debugger.isAttached()) {
      targetContents.debugger.detach()
    }
  }
}

function sendEmbeddedStatus(status: { status: string; url?: string; error?: string }) {
  if (embeddedOwnerId == null) return

  const ownerWindow = BrowserWindow.getAllWindows().find(
    (browserWindow) => browserWindow.webContents.id === embeddedOwnerId,
  )

  ownerWindow?.webContents.send('webcontents-status', status)
}

function destroyEmbeddedView(mainWindow?: BrowserWindow | null, notify = true) {
  if (!embeddedView) return

  const ownerWindow = mainWindow
    ?? BrowserWindow.getAllWindows().find((browserWindow) => browserWindow.contentView.children.includes(embeddedView!))

  if (ownerWindow) {
    ownerWindow.contentView.removeChildView(embeddedView)
  }

  if (notify) {
    sendEmbeddedStatus({ status: 'destroyed' })
  }

  embeddedView.webContents.close()
  embeddedView = null
  embeddedOwnerId = null
}

function createWindow() {
  const windowIcon = resolveWindowIcon()

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'PublishKaro',
    ...(windowIcon ? { icon: windowIcon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      // Allow loading http:// localhost resources without mixed-content blocking
      allowRunningInsecureContent: true,
      webSecurity: false,
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

    destroyEmbeddedView(mainWindow, false)
    const { url, bounds } = payload

    const absoluteBounds = {
      x: Math.max(0, Math.round(bounds.x)),
      y: Math.max(0, Math.round(bounds.y)),
      width: Math.max(320, Math.round(bounds.width)),
      height: Math.max(240, Math.round(bounds.height)),
    }

    console.log(`[Main] Embedding WebContentsView at`, absoluteBounds, 'loading:', url)

    embeddedView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        allowRunningInsecureContent: true,
      },
    })
    embeddedOwnerId = event.sender.id

    mainWindow.contentView.addChildView(embeddedView)
    embeddedView.setBounds(absoluteBounds)
    embeddedView.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
      embeddedView?.webContents.loadURL(nextUrl)
      return { action: 'deny' }
    })

    sendEmbeddedStatus({ status: 'loading', url })

    embeddedView.webContents.on('did-start-loading', () => {
      sendEmbeddedStatus({
        status: 'loading',
        url: embeddedView?.webContents.getURL() || url,
      })
    })

    embeddedView.webContents.on('dom-ready', () => {
      sendEmbeddedStatus({
        status: 'loaded',
        url: embeddedView?.webContents.getURL() || url,
      })
    })

    embeddedView.webContents.on('did-navigate-in-page', (_e, navUrl, isMainFrame) => {
      if (isMainFrame) {
        sendEmbeddedStatus({ status: 'loaded', url: navUrl })
      }
    })

    embeddedView.webContents.on('did-navigate', (_e, navUrl) => {
      sendEmbeddedStatus({ status: 'loaded', url: navUrl })
    })

    embeddedView.webContents.on('did-fail-load', (_e, code, desc, failedUrl, isMainFrame) => {
      if (isMainFrame && code !== -3) {
        sendEmbeddedStatus({
          status: 'error',
          url: failedUrl,
          error: `${desc} (${code})`,
        })
      }
    })

    embeddedView.webContents.loadURL(url).catch((error) => {
      sendEmbeddedStatus({ status: 'error', url, error: error.message })
    })
  })

  /**
   * destroy-webcontents: Remove and destroy the embedded WebContentsView
   */
  ipcMain.on('destroy-webcontents', (event) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender)
    if (!mainWindow || !embeddedView) return

    destroyEmbeddedView(mainWindow)
    console.log('[Main] WebContentsView destroyed')
  })

  /**
   * resize-webcontents: Update the embedded view bounds when the card resizes
   */
  ipcMain.on('resize-webcontents', (_event, bounds: { x: number; y: number; width: number; height: number }) => {
    if (embeddedView) {
      embeddedView.setBounds({
        x: Math.max(0, Math.round(bounds.x)),
        y: Math.max(0, Math.round(bounds.y)),
        width: Math.max(320, Math.round(bounds.width)),
        height: Math.max(240, Math.round(bounds.height)),
      })
    }
  })

  ipcMain.handle('pick-local-pdf', async (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender) ?? win ?? undefined
    const result = await dialog.showOpenDialog(ownerWindow, {
      title: 'Choose Manuscript PDF',
      properties: ['openFile'],
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
      ],
    })

    return result.canceled ? null : result.filePaths[0] ?? null
  })

  ipcMain.handle('attach-file-to-portal-input', async (_event, payload: { webContentsId: number; filePath: string }) => {
    if (!payload?.webContentsId) {
      return {
        success: false,
        reason: 'Could not locate the embedded portal for file upload.',
      }
    }

    const targetContents = webContents.fromId(payload.webContentsId)
    if (!targetContents) {
      return {
        success: false,
        reason: 'The embedded portal is no longer available for file upload.',
      }
    }

    return attachFileToPortalInput(targetContents, payload.filePath)
  })
})
