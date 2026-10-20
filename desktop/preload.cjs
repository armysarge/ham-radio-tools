const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('hrtDesktop', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  getState: () => ipcRenderer.invoke('window:state'),
  copyText: text => ipcRenderer.invoke('clipboard:copy', text),
  saveFile: (name, bytes) => ipcRenderer.invoke('files:save', name, bytes),
  checkUpdate: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateProgress: callback => {
    const listener = (_event, percent) => callback(percent)
    ipcRenderer.on('updates:progress', listener)
    return () => ipcRenderer.removeListener('updates:progress', listener)
  },
  onState: callback => {
    const listener = (_event, state) => callback(state)
    ipcRenderer.on('window:changed', listener)
    return () => ipcRenderer.removeListener('window:changed', listener)
  },
})
