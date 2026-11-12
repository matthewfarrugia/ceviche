import { createHostChannel, withParentOrigin } from '../src'
import { host } from '../src/host'

const ui = {
  iframe: document.getElementById('frame') as HTMLIFrameElement,
  origin: document.getElementById('origin') as HTMLSelectElement,
  reload: document.getElementById('reload') as HTMLButtonElement,
  status: document.getElementById('status') as HTMLSpanElement,
  inspect: document.getElementById('inspect') as HTMLButtonElement,
  targetHeader: document.querySelector('.block-head h2') as HTMLHeadingElement,
  target: document.getElementById('target') as HTMLDivElement,
  element: document.getElementById('element') as HTMLSpanElement,
  variables: document.getElementById('variables') as HTMLDListElement
}

ui.reload.addEventListener('click', reloadFrame)
ui.origin.addEventListener('change', reloadFrame)
ui.inspect.addEventListener('click', () => {
  channelHost?.toggleInspector()
})

function frameOrigin(): string {
  if (ui.origin.value === 'same') return location.origin
  const url = new URL(location.origin)
  url.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost'
  return url.origin
}

let channelHost: ReturnType<typeof host> | null = null

function setStatus(ready: boolean) {
  ui.status.classList.toggle('ready', ready)
  ui.status.textContent = ready ? 'Frame ready' : 'Reloading frame...'
  ui.inspect.disabled = !ready
}

function reloadFrame() {
  channelHost?.channel.dispose()
  setStatus(false)

  const origin = frameOrigin()
  channelHost = host(createHostChannel(ui.iframe, origin), {
    ready: setStatus,
    inspector: (enabled) => {
      ui.inspect.ariaPressed = enabled ? 'true' : 'false'
    },
    target: (target) => {
      ui.targetHeader.textContent = target ? 'Target' : 'No Target'
      ui.target.classList.toggle('hidden', !target)
      ui.element.textContent = target?.element ?? ''
      ui.variables.innerHTML = ''
      for (const [variable, inspection] of target.variables) {
        const dt = document.createElement('dt')
        dt.textContent = variable
        const dd = document.createElement('dd')
        if (inspection.value) {
          dd.textContent = inspection.value
        } else {
          dd.innerHTML = `<em>no value</em>`
        }
        ui.variables.appendChild(dt)
        ui.variables.appendChild(dd)
      }
    }
  })
  ui.iframe.src = withParentOrigin(origin + '/frame.html').toString()
}

reloadFrame()