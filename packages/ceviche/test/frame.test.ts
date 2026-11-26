import { frame } from '../src/frame'
import type { Inspector } from '../src/inspector'
import type { FrameMessages, HostMessages } from '../src/protocol'
import { fakeChannel } from './helpers'

function setup(attr?: string) {
  const fake = fakeChannel<FrameMessages, HostMessages>()
  const inspector = { start: vi.fn(), end: vi.fn(), select: vi.fn() } satisfies Inspector
  frame(fake.channel, { inspector, attr })
  return { ...fake, inspector }
}

const rootStyle = () => document.documentElement.style

beforeEach(() => {
  document.body.innerHTML = `<header data-ceviche-id="toolbar"><a data-ceviche-id="tab">A</a><a data-ceviche-id="tab" id="b">B</a></header>`
})
afterEach(() => {
  document.documentElement.removeAttribute('style')
})

describe('frame', () => {
  test('announces itself with frame:ready', () => {
    const { last } = setup()
    expect(last('frame:ready')).toEqual({ url: window.location.href })
  })

  test('starts and ends the inspector', () => {
    const { emit, inspector } = setup()
    emit('inspector:set', { enabled: true })
    expect(inspector.start).toHaveBeenCalledOnce()
    emit('inspector:set', { enabled: false })
    expect(inspector.end).toHaveBeenCalledOnce()
  })

  test('applies variables on <html> and reverts ones left out', () => {
    const { emit } = setup()
    emit('variables:set', { values: { '--a': 'red', '--b': '1px' } })
    expect(rootStyle().getPropertyValue('--a')).toBe('red')
    emit('variables:set', { values: { '--b': '2px' } })
    expect(rootStyle().getPropertyValue('--a')).toBe('')
    expect(rootStyle().getPropertyValue('--b')).toBe('2px')
  })

  test('reports applied variables back to the host', async () => {
    const { emit, last } = setup()
    emit('variables:set', { values: { '--brand': 'red' } })
    await vi.waitFor(() => expect(last('variables:updated')).toEqual({ values: { '--brand': 'red' } }))
  })

  test('selects the target at a path', () => {
    const { emit, inspector } = setup()
    emit('target:select', { path: 'toolbar/tab[1]' })
    expect(inspector.select).toHaveBeenCalledWith(document.getElementById('b'))
  })

  test('ignores a path that does not resolve', () => {
    const { emit, inspector } = setup()
    emit('target:select', { path: 'toolbar/missing' })
    emit('target:select', { path: '' })
    expect(inspector.select).not.toHaveBeenCalled()
  })

  test('resolves paths with a custom attribute', () => {
    document.body.innerHTML = `<div data-x="a"><b data-x="b" id="b"></b></div>`
    const { emit, inspector } = setup('data-x')
    emit('target:select', { path: 'a/b' })
    expect(inspector.select).toHaveBeenCalledWith(document.getElementById('b'))
  })
})
