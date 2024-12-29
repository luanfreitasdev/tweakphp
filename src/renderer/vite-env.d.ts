/// <reference types="vite/client" />

import { IpcRenderer, PlatformInfo } from '../preload/preload'

interface Window {
  ipcRenderer: IpcRenderer
  platformInfo: PlatformInfo
}
