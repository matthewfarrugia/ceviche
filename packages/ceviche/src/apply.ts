import { isCustomProperty } from './css'
import { isString } from './utils'

type VariableApplier = {
  apply(values: Record<string, string>, options?: Partial<Omit<ApplierOptions, 'target'>>): number
  clear(): void
  readonly applied: Set<string>
}

type ApplierOptions = {
  target?: Document | HTMLElement,
  replace?: boolean
}

export function createVariableApplier(globalOptions: ApplierOptions = { replace: false }): VariableApplier {
  const target = globalOptions.target ?? document
  const element = 'documentElement' in target ? target.documentElement : target
  let applied = new Set<string>()
  return {
    apply(values, options: Partial<Omit<ApplierOptions, 'target'>> = {}) {
      const appliedProperties = new Set<string>()
      for (const [name, value] of Object.entries(values)) {
        if (!isCustomProperty(name) || !isString(value)) continue
        element.style.setProperty(name, value)
        appliedProperties.add(name)
      }
      for (const name of applied) {
        if (appliedProperties.has(name)) continue
        if (options.replace ?? globalOptions.replace) {
          element.style.removeProperty(name)
        } else {
          appliedProperties.add(name)
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