import { inspect } from './inspect'
import type { Channel, FrameMessages, HostMessages } from './protocol'
import { serializeInspection } from './serialization'
import { closestTarget } from './targets'

/** Marks the currently selected target */
export const SELECTED_TARGET_ATTRIBUTE = 'data-ceviche-selected'

type InspectorOptions = {
  attribute?: string
  label?: (el: Element) => string
  onEnter?: () => void
  onHover?: (el: Element) => void
  onSelect?: (el: Element) => void
  onExit?: () => void
}

export function defaultInspector(channel: Channel<FrameMessages, HostMessages>, options: Omit<InspectorOptions, 'onEnter' | 'onSelect' | 'onExit'> = {}) {
  return create({
    onEnter: () => {
      channel.post('frame:status', { inspecting: true })
    },
    onSelect: (el: Element) => {
      channel.post('target:selected', serializeInspection(inspect(el, { attr: options.attribute })))
    },
    onExit: () => {
      channel.post('frame:status', { inspecting: false })
    },
    ...options
  })
}

export type Inspector = ReturnType<typeof create>

export function create(options: InspectorOptions) {
  const hoverBox = createBox()
  const selectedBox = createBox('ceviche-box selected')

  const mouseover = (event: MouseEvent) => {
    const target = event.target as Element
    const closest = closestTarget(target, options.attribute)
    if (!closest) return
    place(hoverBox, closest, options.label?.(closest) ?? closest.tagName)
    options.onHover?.(closest)
  }

  const click = (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    selectTarget(event.target as Element)
  }

  const selectTarget = (target: Element) => {
    document.querySelectorAll(`[${SELECTED_TARGET_ATTRIBUTE}]`).forEach(el => el.removeAttribute(SELECTED_TARGET_ATTRIBUTE))
    const closest = closestTarget(target, options.attribute)
    if (!closest) return
    closest.setAttribute(SELECTED_TARGET_ATTRIBUTE, '1')
    place(selectedBox, closest, options.label?.(closest) ?? closest.tagName)
    options.onSelect?.(closest)
  }

  const start = () => {
    document.addEventListener('mouseover', mouseover)
    document.addEventListener('click', click, { capture: true })
    options.onEnter?.()
  }
  const end = () => {
    document.removeEventListener('mouseover', mouseover)
    document.removeEventListener('click', click, { capture: true })
    hoverBox.hidden = true
    selectedBox.hidden = true
    options.onExit?.()
  }
  return {
    start,
    end,
    select: selectTarget,
  }
}

function createBox(className: string = 'ceviche-box'): HTMLDivElement {
  const box = document.createElement('div')
  box.className = className
  box.hidden = true
  box.append(document.createElement('span'))
  document.body.append(box)
  return box
}

function place(box: HTMLDivElement, el: Element, label: string) {
  const rect = el.getBoundingClientRect()
  Object.assign(box.style, {
    top: `${rect.top - 2}px`,
    left: `${rect.left - 2}px`,
    width: `${rect.width + 4}px`,
    height: `${rect.height + 4}px`,
  })
  box.firstElementChild!.textContent = label
  box.hidden = false
}
