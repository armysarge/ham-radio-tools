// Keep the initial module small: the static splash is visible while the application bundle loads.
window.hrtStartup?.update(15, 'Loading application resources…')
export const startup = import('./bootstrap').then(({ startApp }) => startApp()).catch(error => {
  window.hrtStartup?.fail()
  console.error('Application startup failed', error)
})
