
export const DEFAULT_TARGET_ATTRIBUTE = 'data-ceviche-id'

export interface TargetOptions {
  /** Attribute that names a target. Defaults to `data-ceviche-id`. */
  attribute?: string
}

const attributeName = (options?: TargetOptions) => options?.attribute ?? DEFAULT_TARGET_ATTRIBUTE

export function targetSelector(attr: string): string {
  return `[${attr}]:not([${attr}=""])`
}

/** The closest target at or above `el`. */
export function closestTarget(el: Element | null | undefined, options?: TargetOptions): Element | null {
  const attr = attributeName(options)
  if (!attr) return el || null
  return el?.closest(targetSelector(attr)) ?? null
}