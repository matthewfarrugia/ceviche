import type { Channel, FrameMessages, HostMessages } from './protocol'
import type { Inspector } from './inspector'

type FrameOptions = {
  inspector: Inspector
}

export function frame(channel: Channel<FrameMessages, HostMessages>, options: FrameOptions) {
  channel.on('inspector:set', ({ enabled }) => {
    if (enabled) options.inspector.start()
    else options.inspector.end()
  })
  channel.post('frame:ready', { url: window.location.href })
}