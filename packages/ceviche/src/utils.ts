
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function'
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

export function resolve<T>(value: T | (() => T)): T {
  return isFunction(value) ? (value as () => T)() : value
}