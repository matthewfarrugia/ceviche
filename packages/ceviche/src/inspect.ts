
import { walkStyleRules, type StyleRuleEntry, parseDeclarations, variableReferences, type Declaration } from './css'

export type InspectedResult = {
  element: Element
  variables: Map<string, InspectedVariable>
}

type VariableUsage = {
  declaration: Declaration
}

export type InspectedVariable = {
  value: string,
  count: number
}

/** Rules that apply to `el` (and, by default, its ancestors). */
export function matchedRules(el: Element): StyleRuleEntry[] {
  const matches: StyleRuleEntry[] = []
  for (const entry of walkStyleRules(el.ownerDocument)) {
    matches.push(entry)
  }
  return matches
}

export function inspect(el: Element): InspectedResult {
  const matches = matchedRules(el)
  const variablesUsages: Record<string, VariableUsage[]> = {}
  for (const match of matches) {
    for (const declaration of parseDeclarations(match.rule.cssText)) {
      if (declaration.property.startsWith('--')) {
        variablesUsages[declaration.property] = variablesUsages[declaration.property] ?? []
        variablesUsages[declaration.property]!.push({ declaration })
      }
      for (const variable of variableReferences(declaration.value)) {
        variablesUsages[variable] = variablesUsages[variable] ?? []
        variablesUsages[variable]!.push({ declaration })
      }
    }
  }

  const variables: Map<string, InspectedVariable> = new Map()
  const computedStyle = el.ownerDocument.defaultView?.getComputedStyle(el)
  for (const [variable, usages] of Object.entries(variablesUsages)) {
    const value = computedStyle?.getPropertyValue(variable)
    variables.set(variable, { value: value ?? '', count: usages.length })
  }

  return {
    element: el,
    variables: variables
  }
}
