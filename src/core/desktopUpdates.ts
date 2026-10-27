import { reactive } from 'vue'
import type { UpdateRelease } from '../platform/desktop'
// Keep an explicit update action and its verified download available when Settings unmounts.
export const desktopUpdateState = reactive({ release: null as UpdateRelease | null, busy: false, action: null as 'check' | 'download' | 'install' | null, downloaded: false, linux: false, message: '', error: '', percent: 0 })
