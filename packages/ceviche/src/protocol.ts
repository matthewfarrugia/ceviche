import { isObject, resolve } from './utils'
import { type SerializedSelection } from './serialization'

export const PROTOCOL = 'ceviche'
export const PROTOCOL_VERSION = 1
export const PARENT_ORIGIN_PARAM = 'ceviche_parent'

export interface Envelope<Type extends string = string, Payload = unknown> {
  protocol: typeof PROTOCOL
  version: number
  type: Type
  payload: Payload
}

/** Turn click-to-inspect on or off. */
export const MSG_INSPECTOR_SET = 'inspector:set'
/** The frame is ready to receive messages. */
export const MSG_FRAME_READY = 'frame:ready'
/** The frame reports its current status. */
export const MSG_FRAME_STATUS = 'frame:status'
/** The target has been selected. */
export const MSG_TARGET_SELECTED = 'target:selected'
/** Messages a host sends to the frame. */
export interface HostMessages {
  [MSG_INSPECTOR_SET]: { enabled: boolean }
}

/** Messages the frame sends to its host. */
export interface FrameMessages {
  [MSG_FRAME_READY]: { url: string }
  [MSG_FRAME_STATUS]: { inspecting: boolean }
  [MSG_TARGET_SELECTED]: SerializedSelection
}

export interface Channel<Out extends object, In extends object> {
  post<Type extends keyof Out & string>(type: Type, payload: Out[Type]): void
  on<Type extends keyof In & string>(type: Type, handler: (payload: In[Type], event: MessageEvent) => void): () => void
  dispose(): void
}

export interface ChannelOptions {
  target: Window | null | (() => Window | null | undefined)
  targetOrigin: string
}

export function isEnvelope(data: unknown): data is Envelope {
  if (!isObject(data)) return false
  if (!('protocol' in data && 'version' in data && 'type' in data)) return false
  if (data.protocol !== PROTOCOL) return false
  if (typeof data.version !== 'number') return false
  if (typeof data.type !== 'string') return false
  return true
}

export function envelope<Type extends string, Payload>(type: Type, payload: Payload): Envelope<Type, Payload>
{
  return {
    protocol: PROTOCOL,
    version: PROTOCOL_VERSION,
    type,
    payload
  }
}

export function createChannel<Out extends object, In extends object>(options: ChannelOptions): Channel<Out, In> {
  const target = () => (resolve(options.target) ?? null)
  const isAllowedOrigin = (origin: string) => origin === options.targetOrigin

  const handlers = new Map<string, Set<(payload: unknown, event: MessageEvent) => void>>()
  const listener = (event: MessageEvent) => {
    const expected = target()
    if (!expected) return
    if (!isEnvelope(event.data)) return
    if (!isAllowedOrigin(event.origin)) return
    if (event.source !== expected) return
    (handlers.get(event.data.type) ?? []).forEach(handler => {
      handler(event.data.payload, event)
    })
  }
  window.addEventListener('message', listener)

  return {
    post: (type, payload) => {
      const targetWindow = target()
      if (!targetWindow) throw new Error(`Ceviche: cannot post "${type}", the target window is not available.`)
      targetWindow.postMessage(envelope(type, payload), options.targetOrigin)
    },
    on: (type, handler) => {
      const set = handlers.get(type) ?? new Set()
      set.add(handler as (payload: unknown, event: MessageEvent) => void)
      handlers.set(type, set)
      return () => set.delete(handler as (payload: unknown, event: MessageEvent) => void)
    },
    dispose: () => {
      window.removeEventListener('message', listener)
      handlers.clear()
    }
  }
}

export function createHostChannel<ExtraOut extends object = {}, ExtraIn extends object = {}>(
  iframe: HTMLIFrameElement,
  frameOrigin: string,
  options: Omit<ChannelOptions, 'target' | 'targetOrigin'> = {},
): Channel<HostMessages & ExtraOut, FrameMessages & ExtraIn>
{
  return createChannel({
    ...options,
    target: iframe.contentWindow,
    targetOrigin: frameOrigin,
  })
}

export function createFrameChannel<ExtraOut extends object = {}, ExtraIn extends object = {}>(
  parentOrigin: string,
  options: Omit<ChannelOptions, 'target' | 'targetOrigin'> = {},
): Channel<FrameMessages & ExtraOut, HostMessages & ExtraIn>
{
  return createChannel({
    ...options,
    target: window.parent,
    targetOrigin: parentOrigin,
  })
}

export function withParentOrigin(url: string | URL, parentOrigin = window.location.origin, param = PARENT_ORIGIN_PARAM): URL {
  const urlObject = url instanceof URL ? url : new URL(url)
  urlObject.searchParams.set(param, parentOrigin)
  return urlObject
}

export function parentOriginFromLocation(
  allow: (origin: string) => boolean,
  param = PARENT_ORIGIN_PARAM,
  location: Location = window.location,
): string | null {
  const value = new URLSearchParams(location.search).get(param)
  if (!value) return null
  return allow(value) ? value : null
}