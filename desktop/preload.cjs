const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('hrtDesktop', {
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  getState: () => ipcRenderer.invoke('window:state'),
  onState: callback => {
    const listener = (_event, state) => callback(state)
    ipcRenderer.on('window:changed', listener)
    return () => ipcRenderer.removeListener('window:changed', listener)
  },
})
