
/**
 * Splits `text` on `separator` wherever it is not inside quotes or brackets.
 * Handles semicolons in `url("a;b")` and commas in `:is(a, b)`.
 */
export function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = []
  let quote = ''
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (c === '\\') {
      i++
      continue
    }
    if (quote) {
      if (c === quote) quote = ''
      continue
    }
    if (c === '"' || c === "'") quote = c
    else if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (c === separator && depth === 0) {
      parts.push(text.slice(start, i))
      start = i + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

export interface Declaration {
  property: string
  value: string
  important: boolean
}

export function parseDeclarations(cssText: string): Declaration[] {
  const declarations: Declaration[] = []
  for (const part of splitTopLevel(cssText, ';')) {
    const match = part.trim().match(/^(--[\w-]+|-?[a-zA-Z][\w-]*)\s*:\s*([\s\S]*)$/)
    if (!match) continue
    let value = match[2]!.trim()
    const important = /!\s*important\s*$/i.test(value)
    if (important) value = value.replace(/!\s*important\s*$/i, '').trim()
    declarations.push({ property: match[1]!, value, important })
  }
  return declarations
}

/** Every custom property referenced by `var()` in `value`, including fallbacks. */
export function variableReferences(value: string): string[] {
  return [...new Set(Array.from(value.matchAll(/var\(\s*(--[\w-]+)/g), (m) => m[1]!))]
}

export function isCustomProperty(name: string): boolean {
  return /^--[\w-]+$/.test(name)
}

export interface StyleRuleEntry {
  rule: CSSStyleRule
  sheet: CSSStyleSheet
  /**
   * The selector to match against, with CSS nesting resolved. Equal to
   * `rule.selectorText` for top-level rules.
   */
  selector: string
  /** Enclosing at-rules, outermost first, e.g. `['@media (min-width: 600px)']`. */
  conditions: string[]
}

/**
 * Resolves a nested rule's selector against its parent selector:
 * `&:hover` under `.a` → `:is(.a):hover`, `.b` under `.a` → `:is(.a) .b`.
 */
export function resolveNestedSelector(selector: string, parentSelector: string | null): string {
  if (!parentSelector) return selector
  const parent = `:is(${parentSelector})`
  return splitTopLevel(selector, ',')
    .map((part) => part.trim())
    .map((part) => (part.includes('&') ? part.replaceAll('&', parent) : `${parent} ${part}`))
    .join(', ')
}

function describeCondition(rule: CSSRule): string | null {
  const text = (rule as CSSConditionRule).conditionText
  if (rule.constructor?.name === 'CSSMediaRule') return `@media ${text}`
  if (rule.constructor?.name === 'CSSSupportsRule') return `@supports ${text}`
  if ('name' in rule && rule.constructor?.name === 'CSSLayerBlockRule') return `@layer ${(rule as CSSLayerBlockRule).name}`
  if (typeof text === 'string' && rule.constructor?.name === 'CSSContainerRule') return `@container ${text}`
  return null
}

function conditionApplies(rule: CSSRule, view: (Window & typeof globalThis) | null): boolean {
  const text = (rule as CSSConditionRule).conditionText
  if (rule.constructor.name === 'CSSMediaRule') return !view?.matchMedia || view.matchMedia(text).matches
  if (rule.constructor.name === 'CSSSupportsRule') return !view?.CSS?.supports || view.CSS.supports(text)
  return true
}

/**
 * Yields every style rule in `doc`, descending into grouping rules
 * (`@media`, `@supports`, `@layer`, `@container`) and nested style rules.
 * Cross-origin stylesheets and rules that throw are skipped rather than
 * aborting the walk.
 */
export function* walkStyleRules(doc: Document = document): Generator<StyleRuleEntry> {
  const view = doc.defaultView as (Window & typeof globalThis) | null

  function* walk(
    rules: CSSRuleList,
    sheet: CSSStyleSheet,
    conditions: string[],
    parentSelector: string | null,
  ): Generator<StyleRuleEntry> {
    for (const rule of Array.from(rules)) {
      let children: CSSRuleList | null = null
      let childConditions = conditions
      let childParent = parentSelector
      try {
        if (rule.constructor.name === 'CSSStyleRule') {
          const styleRule = rule as CSSStyleRule
          const selector = resolveNestedSelector(styleRule.selectorText, parentSelector)
          yield { rule: styleRule, sheet, selector, conditions }
          children = styleRule.cssRules?.length ? styleRule.cssRules : null
          childParent = selector
        } else if ('cssRules' in rule) {
          if (!conditionApplies(rule, view)) continue
          const condition = describeCondition(rule)
          if (condition) childConditions = [...conditions, condition]
          children = (rule as CSSGroupingRule).cssRules
        }
      } catch {
        continue // an individual unsupported rule must not stop the walk
      }
      if (children) yield* walk(children, sheet, childConditions, childParent)
    }
  }

  for (const sheet of Array.from(doc.styleSheets)) {
    if (sheet.disabled) continue
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue // cross-origin stylesheet without CORS
    }
    if (sheet.media?.mediaText && view?.matchMedia && !view.matchMedia(sheet.media.mediaText).matches) {
      continue
    }
    yield* walk(rules, sheet, [], null)
  }
}