import { parseDeclarations, resolveNestedSelector, splitTopLevel, variableReferences, walkStyleRules } from '../src/css'

test('splits declarations without breaking quoted or bracketed semicolons', () => {
  expect(parseDeclarations(`background: url("a;b.png") no-repeat; --x: var(--y, 1px) !important; color:red`)).toEqual([
    { property: 'background', value: 'url("a;b.png") no-repeat', important: false },
    { property: '--x', value: 'var(--y, 1px)', important: true },
    { property: 'color', value: 'red', important: false },
  ])
})

test('finds every variable reference including fallbacks', () => {
  expect(variableReferences('var(--a) var(--b, var(--c, 2px))')).toEqual(['--a', '--b', '--c'])
})

test('splits selector lists at the top level only', () => {
  expect(splitTopLevel(':is(.a, .b) .c, .d', ',')).toEqual([':is(.a, .b) .c', ' .d'])
})

test('resolves nested selectors', () => {
  expect(resolveNestedSelector('&:hover, .child', '.a, .b')).toBe(':is(.a, .b):hover, :is(.a, .b) .child')
})

test('walks rules inside grouping rules with their conditions', () => {
  document.head.innerHTML = `<style>
    :root { --x: red }
    @media (min-width: 1px) { .a { color: var(--x) } }
    @supports (display: grid) { .b { color: blue } }
  </style>`
  const entries = [...walkStyleRules(document)].map((e) => [e.selector, e.conditions])
  expect(entries).toContainEqual([':root', []])
  expect(entries).toContainEqual(['.a', ['@media (min-width: 1px)']])
})
