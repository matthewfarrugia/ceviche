// @vitest-environment jsdom
import { findTargetByPath, buildTargetTree, ownedDescendants } from '../src/targets'

beforeEach(() => {
  document.body.innerHTML = `
    <header data-ceviche-id="toolbar">
      <nav data-ceviche-id="tabs">
        <a data-ceviche-id="tab"><span>One</span></a>
        <a data-ceviche-id="tab"><span>Two</span></a>
      </nav>
      <button data-ceviche-id="subscribe">Action</button>
    </header>
    <main data-ceviche-id="timeline">
      <article data-ceviche-id="card">
        <header data-ceviche-id="meta"><h2 data-ceviche-id="title">nested</h2></header>
        <h2 data-ceviche-id="title">A</h2>
      </article>
      <article data-ceviche-id="card">
        <h2 data-ceviche-id="title">B</h2>
        <p>summary <em>here</em></p>
      </article>
    </main>`
})

const byText = (text: string) => Array.from(document.querySelectorAll('[data-ceviche-id]')).find(el => el.textContent?.trim() === text)!

describe('buildTargetTree', () => {
  it('lists every path with sibling indices', () => {
    expect(buildTargetTree(document.body).paths()).toEqual([
      'toolbar',
      'toolbar/tabs',
      'toolbar/tabs/tab[0]',
      'toolbar/tabs/tab[1]',
      'toolbar/subscribe',
      'timeline',
      'timeline/card[0]',
      'timeline/card[0]/meta',
      'timeline/card[0]/meta/title',
      'timeline/card[0]/title',
      'timeline/card[1]',
      'timeline/card[1]/title',
    ])
  })

  it('gives the path of a target', () => {
    const map = buildTargetTree(document.body)
    expect(map.pathOf(byText('Two'))).toBe('toolbar/tabs/tab[1]')
    expect(map.pathOf(byText('B'))).toBe('timeline/card[1]/title')
    expect(map.pathOf(document.querySelector('p')!)).toBeNull()
  })
})

describe('findTargetByPath', () => {
  it('round-trips every path', () => {
    const map = buildTargetTree(document.body)
    for (const path of map.paths()) {
      const el = findTargetByPath(path.split('/'), {root: document.body})
      expect(el).not.toBeNull()
      expect(map.pathOf(el!)).toBe(path)
    }
  })

  it('does not match same-id targets nested deeper', () => {
    expect(findTargetByPath(['timeline', 'card[0]', 'title'])?.textContent).toBe('A')
  })

  it('returns null for unknown or empty paths', () => {
    expect(findTargetByPath(['nope'])).toBeNull()
    expect(findTargetByPath(''.split('/'))).toBeNull()
    expect(findTargetByPath(['toolbar', 'tabs', 'tab[5]'])).toBeNull()
  })
})

describe('ownedDescendants', () => {
  it('stops at nested targets', () => {
    const card = document.querySelectorAll('article')[1]!
    expect(ownedDescendants(card).map(el => el.tagName)).toEqual(['P', 'EM'])
  })
})
