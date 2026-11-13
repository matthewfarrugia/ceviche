import {
    MSG_SET_INSPECTOR,
    MSG_SET_VARIABLES,
    MSG_SELECT_TARGET,
    MSG_FRAME_READY,
    MSG_FRAME_STATUS,
    MSG_TARGET_SELECTED,
    type Channel,
    type FrameMessages,
    type HostMessages,
    MSG_VARIABLES_UPDATED
} from './protocol'
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
        selection: null as SerializedSelection | null,
        values: {} as Record<string, string>
    }
    channel.on(MSG_FRAME_READY, () => {
        state.ready = true
        handlers.ready(true)
        channel.post(MSG_SET_INSPECTOR, { enabled: true })
    })
    channel.on(MSG_FRAME_STATUS, ({ inspecting }) => {
        state.inspectorEnabled = inspecting
        handlers.inspector(inspecting)
    })
    channel.on(MSG_TARGET_SELECTED, selection => {
        state.selection = selection
        handlers.target(selection)
        // if (state.values['--brand'] !== '#334411') {
        //     channel.post(MSG_SET_VARIABLES, { values: { '--brand': '#334411' } })
        // }
    })
    channel.on(MSG_VARIABLES_UPDATED, ({ values }) => {
        state.values = values
        console.log('Variables updated:', values)
        channel.post(MSG_SELECT_TARGET, { path: state.selection?.path ?? '' })
    })
    return {
        channel,
        ...state,
        toggleInspector: () => {
            channel.post(MSG_SET_INSPECTOR, { enabled: !state.inspectorEnabled })
        },
        selectTarget: (path: string) => {
            channel.post(MSG_SELECT_TARGET, { path })
        }
    }
}