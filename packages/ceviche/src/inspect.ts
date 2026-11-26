
import { parseDeclarations, variableReferences, walkStyleRules, type StyleRuleEntry } from './css'
import { buildTargetTree, type TargetOptions } from './targets'

export type InspectedResult = {
  /** The targeted element */
  element: Element
  /** The target's path */
  path: string | null
  /** Every target path currently in the document */
  targetTree: string[]
  /** Every CSS variable used by the element */
  variables: Map<string, InspectedVariable>
}

export interface InspectedVariable {
  name: string
  /** Computed value on the element: the ground truth. */
  value: string
  /**
   * How it's used: the role of the variable's presence on the element.
   * `used` = the variable is read on a property of the element.
   * `defined` = the variable is declared on the element.
   */
  roles: Set<'used' | 'defined'>
  /** Declarations on this element that read it (property: ...var(--x)...). */
  usages: Usage[]
  /** Declarations that could supply its value: on the element or an ancestor. */
  definitions: Definition[]
}

export type Source = {
}

export interface Definition {
  value: string
  source: 'inline' | 'rule'
  selector: string | null,
  important: boolean
}

export interface Usage {
  property: string
  source: 'inline' | 'rule'
  selector: string | null,
}

/** Rules that apply to `el` */
export function matchedRules(el: Element): StyleRuleEntry[] {
  const matches: StyleRuleEntry[] = []
  for (const entry of walkStyleRules(el.ownerDocument)) {
    if (!el.matches(entry.selector)) continue
    matches.push(entry)
  }
  return matches
}

function inlineCss(element: Element): string {
  if (element instanceof HTMLElement) {
    return element.style.cssText
  }
  return ''
}

export function inspect(element: Element, options: TargetOptions = {}): InspectedResult {
  const owner = element.ownerDocument

  const inlineCssText = inlineCss(element)
  const sources = [
    ...(inlineCssText ? [{
      source: 'inline' as const,
      selector: null,
      cssText: inlineCssText
    }] : []),
    ...matchedRules(element).map(match => ({
      source: 'rule' as const,
      selector: match.selector,
      cssText: match.rule.style.cssText
    }))
  ]

  const variablesUsages: Record<string, Usage[]> = {}
  const variableDefinitions: Record<string, Definition[]> = {}
  for (const { source, selector, cssText } of sources) {
    for (const declaration of parseDeclarations(cssText)) {
      if (declaration.property.startsWith('--')) {
        const variable = declaration.property
        ;(variableDefinitions[variable] = variableDefinitions[variable] ?? []).push({
          value: declaration.value,
          source,
          selector,
          important: declaration.important
        })
      }
      for (const variable of variableReferences(declaration.value)) {
        (variablesUsages[variable] = variablesUsages[variable] ?? []).push({
          property: declaration.property,
          source,
          selector
        })
      }
    }
  }

  const variables: Map<string, InspectedVariable> = new Map()
  const computedStyle = owner.defaultView?.getComputedStyle(element)
  for (const [variable, usages] of Object.entries(variablesUsages)) {
    const definitions = variableDefinitions[variable] ?? []
    variables.set(variable, {
      name: variable,
      value: computedStyle?.getPropertyValue(variable) ?? '',
      roles: new Set(definitions.length > 0 ? ['used', 'defined'] : ['used']),
      usages,
      definitions: definitions
    })
  }

  for (const [variable, definitions] of Object.entries(variableDefinitions)) {
    if (variables.has(variable)) continue
    variables.set(variable, {
      name: variable,
      value: computedStyle?.getPropertyValue(variable) ?? '',
      roles: new Set(['defined']),
      usages: [],
      definitions
    })
  }

  const targetTree = buildTargetTree(owner.body, options)

  return {
    element,
    path: targetTree.pathOf(element),
    targetTree: targetTree.paths(),
    variables: variables
  }
}

