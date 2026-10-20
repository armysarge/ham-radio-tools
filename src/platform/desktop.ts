export interface DesktopWindowState { maximized: boolean }
export interface DesktopControls {
  minimize(): void
  toggleMaximize(): void
  close(): void
  getState(): Promise<DesktopWindowState>
  onState(callback: (state: DesktopWindowState) => void): () => void
}
declare global { interface Window { hrtDesktop?: DesktopControls } }
