export interface DesktopWindowState { maximized: boolean }
export interface UpdateRelease { version: string; name: string; size: number }
export interface UpdateResult { error?: string; canceled?: boolean; release?: UpdateRelease | null; downloaded?: boolean; platform?: string; revealed?: boolean; opened?: boolean }
export interface DesktopControls {
  startupVisible?(): Promise<void>
  minimize(): void
  toggleMaximize(): void
  close(): void
  getState(): Promise<DesktopWindowState>

  copyText(text: string): Promise<void>
  saveFile(name: string, bytes: Uint8Array): Promise<void>
  fetchElements?(): Promise<{ text?: string; retrievedAt?: string; error?: string }>
  checkUpdate(): Promise<UpdateResult>
  downloadUpdate(): Promise<UpdateResult>
  installUpdate(): Promise<UpdateResult>
  onUpdateProgress(callback: (percent: number) => void): () => void
  onState(callback: (state: DesktopWindowState) => void): () => void
}
declare global { interface Window { hrtDesktop?: DesktopControls } }
