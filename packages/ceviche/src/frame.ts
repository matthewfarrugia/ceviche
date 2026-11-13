import {
  MSG_SET_INSPECTOR,
  MSG_SET_VARIABLES,
  MSG_SELECT_TARGET,
  MSG_FRAME_READY,
  type Channel,
  type FrameMessages,
  type HostMessages
} from './protocol'
import type { Inspector } from './inspector'
import { createVariableApplier } from './apply'
import { findTargetByPath } from './targets'
import { isString } from './utils'

type FrameOptions = {
  inspector: Inspector
  attr?: string
}

export function frame(channel: Channel<FrameMessages, HostMessages>, options: FrameOptions) {
  const applier = createVariableApplier()
  channel.on(MSG_SET_INSPECTOR, ({ enabled }) => {
    if (enabled) options.inspector.start()
    else options.inspector.end()
  })
  channel.on(MSG_SET_VARIABLES, ({ values }) => {
    applier.apply(values)
  })
  channel.on(MSG_SELECT_TARGET, ({ path }) => {
    if (!isString(path)) throw new Error('Ceviche: path is not a string')
    const target = findTargetByPath(path, { root: document.body, attr: options.attr })
    if (target) {
      options.inspector.select(target)
    }
  })
  channel.post(MSG_FRAME_READY, { url: window.location.href })
}
