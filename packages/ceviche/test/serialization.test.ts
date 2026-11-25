import { inspect } from '../src/inspect'
import { serializeInspection } from '../src/serialization'

test('serializes an inspection into postMessage-safe data', () => {
  document.head.innerHTML = `<style>.a { display: block; color: var(--x) }</style>`
  document.body.innerHTML = `<p class="a" data-ceviche-id="p">x</p>`
  const serialized = serializeInspection(inspect(document.querySelector('.a')!))
  expect(serialized.element).toBe('P')
  expect(serialized.path).toBe('p')
  expect(serialized.targetTree).toEqual(['p'])
  expect(Object.values(serialized).some((v) => v instanceof Element)).toBe(false)
  expect(structuredClone(serialized)).toEqual(serialized)
})
