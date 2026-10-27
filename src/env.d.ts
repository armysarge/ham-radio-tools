declare const __APP_VERSION__: string
interface ImportMetaEnv { readonly VITE_GA_ID?: string }
interface Window {
  hrtStartup?: { update(value: number, label: string): void; complete(): void; fail(): void }
}
