import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { IPCHandler } from './ipc/IPCHandler'
import { FileSystemManager } from './services/FileSystemManager'
import { ProcessManager } from './services/ProcessManager'
import { WorkspaceManager } from './services/WorkspaceManager'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Global service instances
let fileSystemManager: FileSystemManager
let processManager: ProcessManager
let workspaceManager: WorkspaceManager
let ipcHandler: IPCHandler

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Initialize services
  fileSystemManager = new FileSystemManager()
  processManager = new ProcessManager()
  workspaceManager = new WorkspaceManager()

  // Initialize IPC handler
  ipcHandler = new IPCHandler(fileSystemManager, processManager, workspaceManager)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test (legacy - can be removed)
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup when app is quitting
app.on('before-quit', () => {
  // Cleanup services
  if (fileSystemManager) {
    fileSystemManager.cleanup()
  }
  if (processManager) {
    processManager.cleanup()
  }
  if (workspaceManager) {
    workspaceManager.cleanup()
  }
  if (ipcHandler) {
    ipcHandler.cleanup()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
