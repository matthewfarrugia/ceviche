import type { Channel, FrameMessages, HostMessages } from './protocol'
import type { SerializedSelection } from './serialization'

type HostStatusHandlers = {
    ready: (ready: boolean) => void,
    inspector: (enabled: boolean) => void
    target: (target: SerializedSelection) => void
}

export function host(channel: Channel<HostMessages, FrameMessages>, handlers: HostStatusHandlers) {
    const state = {
        ready: false,
        inspectorEnabled: false,
    }
    channel.on('frame:ready', () => {
        state.ready = true
        handlers.ready(true)
        channel.post('inspector:set', { enabled: true })
    })
    channel.on('frame:status', ({ inspecting }) => {
        state.inspectorEnabled = inspecting
        handlers.inspector(inspecting)
    })
    channel.on('target:selected', selection => {
        handlers.target(selection)
    })
    return {
        channel,
        ...state,
        toggleInspector: () => {
            channel.post('inspector:set', { enabled: !state.inspectorEnabled })
        }
    }
}