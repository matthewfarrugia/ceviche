import {
    MSG_SET_INSPECTOR,
    MSG_SELECT_TARGET,
    MSG_FRAME_READY,
    MSG_FRAME_STATUS,
    MSG_TARGET_SELECTED,
    MSG_SET_VARIABLES,
    MSG_UPSERT_VARIABLES,
    MSG_CLEAR_VARIABLES,
    MSG_VARIABLES_UPDATED,
    type Channel,
    type FrameMessages,
    type HostMessages,
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
    })
    channel.on(MSG_VARIABLES_UPDATED, ({ values }) => {
        state.values = values
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
        },
        setVariables: (values: Record<string, string>) => {
            channel.post(MSG_SET_VARIABLES, { values })
        },
        upsertVariables: (values: Record<string, string>) => {
            channel.post(MSG_UPSERT_VARIABLES, { values })
        },
        clearVariables: () => {
            channel.post(MSG_CLEAR_VARIABLES)
        },
    }
}