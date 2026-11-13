import { isCustomProperty } from './css'
import { isString } from './utils'

type VariableApplier = {
  apply(values: Record<string, string>): number
  clear(): void
  readonly applied: Set<string>
}

export function createVariableApplier(target: Document | HTMLElement = document): VariableApplier {
  const element = 'documentElement' in target ? target.documentElement : target
  let applied = new Set<string>()
  return {
    apply(values) {
      const appliedProperties = new Set<string>()
      for (const [name, value] of Object.entries(values)) {
        if (!isCustomProperty(name) || !isString(value)) continue
        element.style.setProperty(name, value)
        appliedProperties.add(name)
      }
      for (const name of applied) {
        if (!appliedProperties.has(name)) {
          element.style.removeProperty(name)
        }
      }
      applied = appliedProperties
      return appliedProperties.size
    },
    clear() {
      for (const name of applied) element.style.removeProperty(name)
      applied = new Set()
    },
    get applied() {
      return applied
    },
  }
}