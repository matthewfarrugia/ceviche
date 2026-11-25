import { createChannel, envelope, isEnvelope, parentOriginFromLocation, PROTOCOL, PROTOCOL_VERSION, withParentOrigin } from '../src/protocol'
import type { FrameMessages, HostMessages } from '../src/protocol'

const dispatch = (data: unknown, origin: string, source: Window | null) =>
  window.dispatchEvent(new MessageEvent('message', { data, origin, source }))

const at = (search: string) => ({ search }) as Location
const allowAll = () => true

describe('protocol', () => {
  test('parentOriginFromLocation normalises a trailing slash to the origin', () => {
    expect(parentOriginFromLocation(allowAll, undefined, at('?ceviche_parent=https%3A%2F%2Fhost.test%2F'))).toBe('https://host.test')
  })

  test('parentOriginFromLocation rejects values that are not an origin', () => {
    expect(parentOriginFromLocation(allowAll, undefined, at('?ceviche_parent=https%3A%2F%2Fhost.test%2Fpath'))).toBeNull()
    expect(parentOriginFromLocation(allowAll, undefined, at('?ceviche_parent=not-a-url'))).toBeNull()
  })
})

describe('envelopes', () => {
  test('envelope() wraps a payload', () => {
    expect(envelope('frame:ready', { url: 'x' })).toEqual({ protocol: PROTOCOL, version: PROTOCOL_VERSION, type: 'frame:ready', payload: { url: 'x' } })
  })

  test('isEnvelope() rejects anything else', () => {
    expect(isEnvelope(envelope('a', null))).toBe(true)
    expect(isEnvelope(null)).toBe(false)
    expect(isEnvelope('string')).toBe(false)
    expect(isEnvelope({ type: 'a', payload: 1 })).toBe(false)
    expect(isEnvelope({ protocol: 'other', version: 1, type: 'a' })).toBe(false)
    expect(isEnvelope({ protocol: PROTOCOL, version: '1', type: 'a' })).toBe(false)
    expect(isEnvelope({ protocol: PROTOCOL, version: 1, type: 2 })).toBe(false)
  })
})

describe('createChannel', () => {
  test('delivers typed messages only from the expected origin and source', () => {
    const channel = createChannel<HostMessages, FrameMessages>({ target: window, targetOrigin: 'https://frame.test' })
    const received: unknown[] = []
    channel.on('frame:status', (payload) => received.push(payload))

    dispatch(envelope('frame:status', { inspecting: true }), 'https://frame.test', window)
    dispatch(envelope('frame:status', { inspecting: false }), 'https://evil.test', window)
    dispatch({ type: 'frame:status', payload: { inspecting: false } }, 'https://frame.test', window)
    dispatch(envelope('frame:status', { inspecting: false }), 'https://frame.test', null)

    expect(received).toEqual([{ inspecting: true }])
    channel.dispose()
  })

  test('dispatches by type and supports unsubscribing', () => {
    const channel = createChannel<HostMessages, FrameMessages>({ target: window, targetOrigin: 'https://frame.test' })
    const status = vi.fn()
    const ready = vi.fn()
    const off = channel.on('frame:status', status)
    channel.on('frame:ready', ready)

    dispatch(envelope('frame:ready', { url: 'u' }), 'https://frame.test', window)
    expect(status).not.toHaveBeenCalled()
    expect(ready).toHaveBeenCalledWith({ url: 'u' }, expect.any(MessageEvent))

    off()
    dispatch(envelope('frame:status', { inspecting: true }), 'https://frame.test', window)
    expect(status).not.toHaveBeenCalled()
    channel.dispose()
  })

  test('stops listening after dispose()', () => {
    const channel = createChannel<HostMessages, FrameMessages>({ target: window, targetOrigin: 'https://frame.test' })
    const handler = vi.fn()
    channel.on('frame:ready', handler)
    channel.dispose()
    dispatch(envelope('frame:ready', { url: 'u' }), 'https://frame.test', window)
    expect(handler).not.toHaveBeenCalled()
  })

  test('re-resolves a target function per message', () => {
    let target: Window | null = null
    const channel = createChannel<HostMessages, FrameMessages>({ target: () => target, targetOrigin: 'https://frame.test' })
    const handler = vi.fn()
    channel.on('frame:ready', handler)
    dispatch(envelope('frame:ready', { url: 'u' }), 'https://frame.test', window)
    target = window
    dispatch(envelope('frame:ready', { url: 'u' }), 'https://frame.test', window)
    expect(handler).toHaveBeenCalledOnce()
    channel.dispose()
  })

  test('posts an envelope to the target with the target origin', () => {
    const postMessage = vi.fn()
    const channel = createChannel<HostMessages, FrameMessages>({ target: { postMessage } as unknown as Window, targetOrigin: 'https://frame.test' })
    channel.post('inspector:set', { enabled: true })
    expect(postMessage).toHaveBeenCalledWith(envelope('inspector:set', { enabled: true }), 'https://frame.test')
    channel.dispose()
  })

  test('throws when posting without a target window', () => {
    const channel = createChannel<HostMessages, FrameMessages>({ target: null, targetOrigin: 'https://frame.test' })
    expect(() => channel.post('inspector:set', { enabled: true })).toThrow(/not available/)
    channel.dispose()
  })
})

describe('parent origin', () => {
  test('withParentOrigin adds the parent origin to a URL', () => {
    const url = withParentOrigin('https://frame.test/page?x=1', 'https://host.test')
    expect(url.searchParams.get('ceviche_parent')).toBe('https://host.test')
    expect(url.searchParams.get('x')).toBe('1')
  })

  test('withParentOrigin supports a custom param and URL objects', () => {
    const url = withParentOrigin(new URL('https://frame.test/'), 'https://host.test', 'p')
    expect(url.searchParams.get('p')).toBe('https://host.test')
  })

  test('parentOriginFromLocation reads an allowed origin', () => {
    expect(parentOriginFromLocation(allowAll, undefined, at('?ceviche_parent=https%3A%2F%2Fhost.test'))).toBe('https://host.test')
  })

  test('parentOriginFromLocation applies the allow check', () => {
    expect(parentOriginFromLocation((o) => o.endsWith('.example'), undefined, at('?ceviche_parent=https%3A%2F%2Fhost.test'))).toBeNull()
  })

  test('parentOriginFromLocation returns null when the param is missing', () => {
    expect(parentOriginFromLocation(allowAll, undefined, at(''))).toBeNull()
    expect(parentOriginFromLocation(allowAll, 'other', at('?ceviche_parent=https%3A%2F%2Fhost.test'))).toBeNull()
  })
})
