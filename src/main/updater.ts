import { autoUpdater, UpdateFileInfo } from 'electron-updater'
import { UpdateInfo } from 'builder-util-runtime'
import { app, ipcMain, shell } from 'electron'
import { window } from './main'
import fs from 'fs'

let update: UpdateInfo

export const init = async () => {
  autoUpdater.autoDownload = false
  if (process.env.DEV) {
    autoUpdater.forceDevUpdateConfig = true
  }
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    update = info
    window.webContents.send('update.available', info)
  })
  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    window.webContents.send('update.not-available', info)
  })
  ipcMain.on('update.check', () => {
    checkForUpdates()
  })
  ipcMain.on('update.download', async (): Promise<void> => {
    if (process.platform === 'darwin') {
      console.log('Downloading macOS update')

      const downloadPath: string = app.getPath('downloads')

      const files: UpdateFileInfo[] = update.files
      const filteredFiles: UpdateFileInfo = files.filter((file: UpdateFileInfo) => file.url.includes('dmg'))[0]
      const fileName: string = filteredFiles.url

      const downloadedFile = `${downloadPath}/${fileName}`

      if (fs.existsSync(downloadedFile)) {
        await shell.openPath(downloadedFile)

        app.quit()
      } else {
        window.webContents.send('update.info', update)
      }
    } else {
      window.webContents.send('update.available', update)
      await autoUpdater.downloadUpdate()
    }
  })
}

export const checkForUpdates = async () => {
  window.webContents.send('update.checking')
  await autoUpdater.checkForUpdates()
}
