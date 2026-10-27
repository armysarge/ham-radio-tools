// Runs before the application module so download/import failures still have a visible recovery screen.
(() => {
  const splash = document.getElementById('startup')
  const bar = document.getElementById('startup-progress')
  const status = document.getElementById('startup-status')
  const reload = document.getElementById('startup-reload')
  const app = document.getElementById('app')
  if (!splash || !bar || !status || !reload || !app) return
  let finished = false, failed = false
  // A hidden renderer can paint before the OS window appears; anchor the hold to Electron's show acknowledgement.
  const firstVisible = window.hrtDesktop?.startupVisible
    ? window.hrtDesktop.startupVisible().then(() => performance.now()).catch(() => performance.now())
    : window.hrtDesktop ? new Promise(resolve => requestAnimationFrame(() => resolve(performance.now()))) : null
  try {
    const theme = JSON.parse(localStorage.getItem('hrt:v1') || '{}').theme
    document.documentElement.dataset.resolved = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'
  } catch { /* System colours remain available when preferences cannot be read. */ }
  const slow = setTimeout(() => {
    status.textContent = 'Startup is taking longer than usual. You can wait or reload the app.'
    reload.hidden = false
  }, 30000)
  const cleanup = () => {
    clearTimeout(slow)
    window.removeEventListener('error', onError, true)
    window.removeEventListener('unhandledrejection', onError)
  }
  function fail() {
    if (finished || failed) return
    failed = true
    cleanup()
    status.setAttribute('role', 'alert')
    status.textContent = 'Couldn’t start Ham Radio Tools. An application resource failed to load. Reload to try again; saved projects have not been erased.'
    reload.hidden = false
  }
  function onError(event) {
    if (event.type === 'unhandledrejection' || event.error || event.target?.tagName === 'SCRIPT') fail()
  }
  window.addEventListener('error', onError, true)
  window.addEventListener('unhandledrejection', onError)
  reload.addEventListener('click', () => location.reload())
  window.hrtStartup = {
    update(value, label) {
      if (finished || failed || !Number.isFinite(value) || value < bar.value) return
      bar.value = Math.min(99, Math.max(0, value))
      status.textContent = label
    },
    fail,
    complete() {
      if (finished) return
      finished = true
      cleanup()
      bar.value = 100
      status.textContent = 'Ready'
      const reveal = () => requestAnimationFrame(() => {
        splash.remove()
        app.removeAttribute('inert')
        app.removeAttribute('aria-hidden')
      })
      if (firstVisible) void firstVisible.then(at => setTimeout(reveal, Math.max(0, 700 - (performance.now() - at))))
      else reveal()
    },
  }
})()
