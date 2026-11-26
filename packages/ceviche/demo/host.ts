import { createHostChannel, withParentOrigin, type InspectedVariable } from '../src'
import { host } from '../src/host'

const ui = {
  iframe: document.getElementById('frame') as HTMLIFrameElement,
  origin: document.getElementById('origin') as HTMLSelectElement,
  reload: document.getElementById('reload') as HTMLButtonElement,
  clear: document.getElementById('clear') as HTMLButtonElement,
  status: document.getElementById('status') as HTMLSpanElement,
  inspect: document.getElementById('inspect') as HTMLButtonElement,
  targetTitle: document.getElementById('target-title') as HTMLHeadingElement,
  empty: document.getElementById('empty') as HTMLParagraphElement,
  target: document.getElementById('target') as HTMLDivElement,
  element: document.getElementById('element') as HTMLSpanElement,
  path: document.getElementById('path') as HTMLElement,
  paths: document.getElementById('paths') as HTMLSelectElement,
  variables: document.getElementById('variables') as HTMLDListElement,
  variableCount: document.getElementById('variable-count') as HTMLSpanElement,
  noVariables: document.getElementById('no-variables') as HTMLParagraphElement
}

ui.reload.addEventListener('click', reloadFrame)
ui.origin.addEventListener('change', reloadFrame)
ui.paths.addEventListener('change', () => {
  channelHost?.selectTarget(ui.paths.value)
})
ui.inspect.addEventListener('click', () => {
  channelHost?.toggleInspector()
})
ui.clear.addEventListener('click', () => {
  channelHost?.clearVariables()
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

function variableRow(variable: string, inspection: InspectedVariable): HTMLDivElement {
  const row = document.createElement('div')
  row.className = 'var'

  const usages = inspection.usages.length
  const propertiesUsed = new Set(inspection.usages.map(usage => usage.property))

  const dt = document.createElement('dt')
  dt.className = 'mono'
  dt.textContent = variable
  dt.title = `Used ${usages} time${usages === 1 ? '' : 's'}`
  if (usages > 1) {
    const uses = document.createElement('span')
    uses.className = 'uses'
    uses.textContent = `×${usages}`
    dt.append(uses)
  }

  const dd = document.createElement('dd')
  dd.className = 'mono'
  if (inspection.value) {
    if (CSS.supports('color', inspection.value)) {
      const swatch = document.createElement('span')
      swatch.className = 'swatch'
      swatch.style.background = inspection.value
      dd.append(swatch)
      row.setAttribute('data-is-color', '1')
    }
    dd.append(inspection.value)
  } else {
    const none = document.createElement('em')
    none.textContent = 'no value'
    if (propertiesUsed.has('color')
      || propertiesUsed.has('background')
      || propertiesUsed.has('background-color')
      || propertiesUsed.has('border-color')
      || propertiesUsed.has('border')
      || propertiesUsed.has('outline-color')
      || propertiesUsed.has('outline')
      || propertiesUsed.has('text-decoration-color')
      || propertiesUsed.has('text-decoration')
      || propertiesUsed.has('fill-color')
      || propertiesUsed.has('fill')
      || propertiesUsed.has('stroke-color')
      || propertiesUsed.has('stroke')
    ) {
      row.setAttribute('data-is-color', '1')
    }
    dd.append(none)
  }

  row.append(dt, dd)
  return row
}

function randomHexColor() {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`
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
      ui.targetTitle.textContent = target ? 'Target' : 'No target'
      ui.empty.hidden = !!target
      ui.target.hidden = !target
      ui.element.textContent = target ? `<${target.element.toLowerCase()}>` : ''
      ui.path.textContent = target?.path ?? ''
      ui.paths.replaceChildren(...(target?.targetTree ?? []).map(path => new Option(path, path, false, path === target?.path)))

      const variables = [...(target?.variables ?? [])]
      ui.variableCount.textContent = variables.length ? String(variables.length) : ''
      ui.noVariables.hidden = variables.length > 0
      const children = []
      for (const [variable, inspection] of variables) {
        const row = variableRow(variable, inspection)
        children.push(row)
        row.onclick = (e) => {
          if (e.target instanceof HTMLElement && e.target.closest('[data-is-color]')) {
            channelHost?.upsertVariables({ [variable]: randomHexColor() })
          }
        }
      }
      ui.variables.replaceChildren(...children)
    }
  })
  ui.iframe.src = withParentOrigin(origin + '/frame.html').toString()
}

reloadFrame()