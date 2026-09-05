import { app, BrowserWindow, Menu, dialog, ipcMain, clipboard, nativeImage, shell } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null

function resolveIcon(): string | undefined {
  const candidates = [
    path.join(app.getAppPath(), 'build/icon.png'),
    path.join(app.getAppPath(), 'build/icons/512x512.png')
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      /* ignore */
    }
  }
  return undefined
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1220,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b1020',
    title: 'QR Code Forge',
    icon: resolveIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open external links in the system browser, never in-app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (DEV_SERVER_URL) {
    void mainWindow.loadURL(DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

/* ---------- IPC bridge (renderer is sandboxed; everything privileged happens here) ---------- */

interface SaveExportRequest {
  defaultName: string
  mime: string
  base64?: string
  text?: string
}

function filtersFor(mime: string, defaultName: string): Electron.FileFilter[] {
  const ext = defaultName.split('.').pop() ?? 'png'
  if (mime === 'image/svg+xml') return [{ name: 'SVG image', extensions: ['svg'] }]
  if (mime === 'image/jpeg') return [{ name: 'JPEG image', extensions: ['jpg', 'jpeg'] }]
  return [{ name: 'PNG image', extensions: ['png'] }, { name: 'All files', extensions: [ext] }]
}

ipcMain.handle('export:save', async (_event, req: SaveExportRequest) => {
  if (!mainWindow) return { saved: false }
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save QR code',
    defaultPath: req.defaultName,
    filters: filtersFor(req.mime, req.defaultName)
  })
  if (canceled || !filePath) return { saved: false }
  try {
    const data =
      req.base64 !== undefined
        ? Buffer.from(req.base64, 'base64')
        : Buffer.from(req.text ?? '', 'utf8')
    await fs.promises.writeFile(filePath, data)
    return { saved: true, filePath }
  } catch (err) {
    return { saved: false, error: String(err) }
  }
})

ipcMain.handle('clipboard:image', (_event, base64: string) => {
  try {
    const image = nativeImage.createFromBuffer(Buffer.from(base64, 'base64'))
    if (image.isEmpty()) return false
    clipboard.writeImage(image)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('app:info', () => ({ name: 'QR Code Forge', version: app.getVersion() }))

/* ---------- app lifecycle ---------- */

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  void app.whenReady().then(() => {
    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ])
      )
    } else {
      // Clean, modern chrome-less window; text-editing shortcuts keep working natively.
      Menu.setApplicationMenu(null)
    }
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
