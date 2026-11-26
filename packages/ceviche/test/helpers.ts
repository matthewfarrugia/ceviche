import type { Channel } from '../src/protocol'

type Handler = (payload: any, event: MessageEvent) => void

/** An in-memory channel: records what is posted and lets tests deliver incoming messages. */
export function fakeChannel<Out extends object, In extends object>() {
  const posted: { type: string; payload: any }[] = []
  const handlers = new Map<string, Set<Handler>>()
  const channel = {
    post: (type: string, payload: unknown) => {
      posted.push({ type, payload })
    },
    on: (type: string, handler: Handler) => {
      const set = handlers.get(type) ?? new Set()
      set.add(handler)
      handlers.set(type, set)
      return () => set.delete(handler)
    },
    dispose: () => handlers.clear(),
  } as unknown as Channel<Out, In>

  /** Delivers an incoming message to the registered handlers. */
  const emit = <Type extends keyof In & string>(type: Type, payload: In[Type]) => {
    handlers.get(type)?.forEach((handler) => handler(payload, new MessageEvent('message')))
  }
  const last = (type: string) => posted.filter((p) => p.type === type).at(-1)?.payload
  return { channel, posted, emit, last }
}
