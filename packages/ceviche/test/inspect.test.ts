import { inspect, type InspectedVariable } from '../src/inspect'

const el = () => document.getElementById('el')!
const inspectedNames = (target: Element) => [...inspect(target).variables.keys()]
const variable = (name: string, target: Element = el()): InspectedVariable => {
  const found = inspect(target).variables.get(name)
  if (!found) throw new Error(`${name} was not listed; got ${inspectedNames(target).join(', ') || 'nothing'}`)
  return found
}
const styles = (css: string) => (document.head.innerHTML = `<style>${css}</style>`)

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('style')
})

describe('core', () => {
  test('includes the all declarations of a rule', () => {
    document.head.innerHTML = `<style>.a { --first: 1px; color: var(--second) }</style>`
    document.body.innerHTML = `<p class="a">x</p>`
    expect(inspectedNames(document.querySelector('.a')!)).toEqual(['--second', '--first'])
  })

  test('includes a variable referenced by the only declaration of a rule', () => {
    document.head.innerHTML = `<style>.a { color: var(--only) }</style>`
    document.body.innerHTML = `<p class="a">x</p>`
    expect(inspectedNames(document.querySelector('.a')!)).toContain('--only')
  })

  test('ignores rules that do not apply to the element or its ancestors', () => {
    document.head.innerHTML = `<style>
      .a { display: block; color: var(--a) }
      .b { display: block; color: var(--unrelated) }
    </style>`
    document.body.innerHTML = `<p class="a">x</p><p class="b">y</p>`
    expect(inspectedNames(document.querySelector('.a')!)).not.toContain('--unrelated')
  })

  test('lists usages on the inspected element only', () => {
    document.head.innerHTML = `<style>
      .a { display: block; color: var(--x) }
      .b { display: block; color: var(--x) }
    </style>`
    document.body.innerHTML = `<p class="a">x</p><p class="b">y</p>`
    expect(variable('--x', document.querySelector('.a')!).usages).toHaveLength(1)
  })

  test('includes variables used in the inline style', () => {
    document.body.innerHTML = `<p class="a" style="padding: var(--pad)">x</p>`
    expect(inspectedNames(document.querySelector('.a')!)).toContain('--pad')
  })

  test('includes custom properties defined inline on the element', () => {
    document.body.innerHTML = `<p class="a" style="--own: 1px; color: var(--used)">x</p>`
    const el = document.querySelector('.a')!
    expect(inspectedNames(el)).toEqual(expect.arrayContaining(['--own', '--used']))
    expect(inspect(el).variables.get('--own')?.value).toBe('1px')
  })

  test('lists both declared and referenced variables, including fallbacks', () => {
    document.head.innerHTML = `<style>.a { display: block; --own: 1px; color: var(--ref, var(--fallback)) }</style>`
    document.body.innerHTML = `<p class="a">x</p>`
    expect(inspectedNames(document.querySelector('.a')!)).toEqual(expect.arrayContaining(['--own', '--ref', '--fallback']))
  })

  test('returns the element, its path and the target tree', () => {
    document.body.innerHTML = `<header data-ceviche-id="toolbar"><a data-ceviche-id="tab">A</a><a data-ceviche-id="tab" id="b">B</a></header>`
    const target = document.getElementById('b')!
    const result = inspect(target)
    expect(result.element).toBe(target)
    expect(result.path).toBe('toolbar/tab[1]')
    expect(result.targetTree).toEqual(['toolbar', 'toolbar/tab[0]', 'toolbar/tab[1]'])
  })

  test('uses a custom target attribute', () => {
    document.body.innerHTML = `<div data-x="a"><b data-x="b" id="b"></b></div>`
    const result = inspect(document.getElementById('b')!, { attr: 'data-x' })
    expect(result.path).toBe('a/b')
    expect(result.targetTree).toEqual(['a', 'a/b'])
  })

  test('path is null for an element that is not a target', () => {
    document.body.innerHTML = `<div data-ceviche-id="a"><span id="s"></span></div>`
    expect(inspect(document.getElementById('s')!).path).toBeNull()
  })

  test('returns no variables for an unstyled page', () => {
    document.body.innerHTML = `<p>x</p>`
    expect(inspect(document.querySelector('p')!).variables.size).toBe(0)
  })
})

describe('InspectedVariable', () => {
  test('reports the full shape of a variable defined and used on the element', () => {
    styles(`.a { --brand: red; color: var(--brand, black) }`)
    document.body.innerHTML = `<p id="el" class="a" data-ceviche-id="p">x</p>`
    expect(variable('--brand')).toMatchObject({
      name: '--brand',
      value: 'red',
      roles: new Set(['used', 'defined']),
      usages: [{ property: 'color', selector: '.a', source: 'rule' }],
      definitions: [{ value: 'red', selector: '.a', source: 'rule', important: false }],
    } satisfies InspectedVariable)
  })

  test('name matches its key in the map', () => {
    styles(`.a { --one: 1px; color: var(--two) }`)
    document.body.innerHTML = `<p id="el" class="a">x</p>`
    for (const [key, v] of inspect(el()).variables) expect(v.name).toBe(key)
  })

  test('survives structured cloning', () => {
    styles(`.a { --x: red; color: var(--x) }`)
    document.body.innerHTML = `<p id="el" class="a" style="--y: 1px">x</p>`
    for (const v of inspect(el()).variables.values()) {
      expect(structuredClone(v)).toEqual(v)
    }
  })
})

describe('value', () => {
  test('is the computed value of a variable defined by a rule on the element', () => {
    styles(`.a { --size: 4px }`)
    document.body.innerHTML = `<p id="el" class="a">x</p>`
    expect(variable('--size').value).toBe('4px')
  })

  test('is the computed value of a variable defined inline on the element', () => {
    document.body.innerHTML = `<p id="el" style="--size: 6px">x</p>`
    expect(variable('--size').value).toBe('6px')
  })

  test('is empty for a variable that is used but never defined', () => {
    styles(`.a { color: var(--missing, red) }`)
    document.body.innerHTML = `<p id="el" class="a">x</p>`
    expect(variable('--missing').value).toBe('')
  })
})

describe('roles', () => {
  test('is "used" for a variable read by a property on the element', () => {
    styles(`.a { color: var(--text) }`)
    document.body.innerHTML = `<p id="el" class="a">x</p>`
    expect(variable('--text').roles).toEqual(new Set(['used']))
  })

  test('is "used" for a variable read by the inline style', () => {
    document.body.innerHTML = `<p id="el" style="margin: var(--gap)">x</p>`
    expect(variable('--gap').roles).toEqual(new Set(['used']))
  })

  test('is "used" for every variable in a fallback chain of a property', () => {
    styles(`.a { color: var(--primary, var(--secondary)) }`)
    document.body.innerHTML = `<p id="el" class="a">x</p>`
    expect(variable('--primary').roles).toEqual(new Set(['used']))
    expect(variable('--secondary').roles).toEqual(new Set(['used']))
  })

  test('is "defined" for a variable declared on the element but not read by it', () => {
    styles(`.a { --only-declared: 1px }`)
    document.body.innerHTML = `<p id="el" class="a">x</p>`
    expect(variable('--only-declared').roles).toEqual(new Set(['defined']))
  })

  test('is both "used" and "defined" for a variable declared and read on the element', () => {
    styles(`.a { --both: red; color: var(--both) }`)
    document.body.innerHTML = `<p id="el" class="a">x</p>`
    expect(variable('--both').roles).toEqual(new Set(['used', 'defined']))
  })
})

describe('usages', () => {
  test('records the property, selector and source of a rule usage', () => {
    styles(`.a { border-color: var(--line) }`)
    document.body.innerHTML = `<p id="el" class="a">x</p>`
    expect(variable('--line').usages).toEqual([
      { property: 'border-color', selector: '.a', source: 'rule' },
    ])
  })

  test('records an inline usage with a null selector', () => {
    document.body.innerHTML = `<p id="el" style="padding: var(--pad)">x</p>`
    expect(variable('--pad').usages).toEqual([
      { property: 'padding', selector: null, source: 'inline' },
    ])
  })

  test('records one usage per declaration that reads the variable', () => {
    styles(`.a { color: var(--brand) } .a.b { border-color: var(--brand) }`)
    document.body.innerHTML = `<p id="el" class="a b" style="outline-color: var(--brand)">x</p>`
    expect(variable('--brand').usages.map((u) => [u.property, u.source])).toEqual(
      expect.arrayContaining([['color', 'rule'], ['border-color', 'rule'], ['outline-color', 'inline']]),
    )
    expect(variable('--brand').usages).toHaveLength(3)
  })

  test('a variable that is only defined has no usages', () => {
    styles(`.a { --only-declared: 1px }`)
    document.body.innerHTML = `<p id="el" class="a">x</p>`
    expect(variable('--only-declared').usages).toEqual([])
  })
})

describe('definitions', () => {
  test('records the raw declared value, not the resolved one', () => {
    styles(`.a { --toolbar-bg: var(--surface-raised); --surface-raised: white; background: var(--toolbar-bg) }`)
    document.body.innerHTML = `<p id="el" class="a">x</p>`
    expect(variable('--toolbar-bg').definitions[0]!.value).toBe('var(--surface-raised)')
  })

  test('records the selector of a rule definition and null for inline', () => {
    styles(`.a { --x: rule }`)
    document.body.innerHTML = `<p id="el" class="a" style="--x: inline">x</p>`
    expect(variable('--x').definitions.map((d) => [d.source, d.selector])).toEqual([['inline', null], ['rule', '.a']])
  })

  test('records !important', () => {
    styles(`.a { --x: red !important } .a.b { --x: blue }`)
    document.body.innerHTML = `<p id="el" class="a b">x</p>`
    const important = Object.fromEntries(variable('--x').definitions.map((d) => [d.value, d.important]))
    expect(important).toEqual({ red: true, blue: false })
  })

  test('excludes definitions from rules that do not match the element', () => {
    styles(`.a { --x: mine } .b { --x: theirs }`)
    document.body.innerHTML = `<p id="el" class="a">x</p><p class="b">y</p>`
    expect(variable('--x').definitions.map((d) => d.value)).toEqual(['mine'])
  })

  test('is empty for a variable that is used but never defined', () => {
    styles(`.a { color: var(--missing) }`)
    document.body.innerHTML = `<p id="el" class="a">x</p>`
    expect(variable('--missing').definitions).toEqual([])
  })
})