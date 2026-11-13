
export const DEFAULT_TARGET_ATTRIBUTE = 'data-ceviche-id'
export const DEFAULT_PATH_SEPARATOR = '/'

/** Selector matching any target (an element with a non-empty target attribute). */
export function targetSelector(attr: string): string {
  return `[${attr}]:not([${attr}=""])`
}

/** Selector matching targets with the given id. */
export function targetIdSelector(id: string, attr = DEFAULT_TARGET_ATTRIBUTE): string {
  return `[${attr}="${id.replace(/["\\]/g, '\\$&')}"]`
}

export function targetAttributeValue(el: Element, attr = DEFAULT_TARGET_ATTRIBUTE): string | null {
  return el.getAttribute(attr) || null
}

/** The closest target at or above `el`. */
export function closestTarget(el: Element | null | undefined, attr = DEFAULT_TARGET_ATTRIBUTE): Element | null {
  return el?.closest(targetSelector(attr)) ?? null
}
export type TargetOptions = {
  /** The root element containing the target tree. */
  root?: Element
  /** The attribute used to identify targets. */
  attr?: string
  separator?: string
}

const attributeName = (options?: TargetOptions) => options?.attr ?? DEFAULT_TARGET_ATTRIBUTE
const separator = (options?: TargetOptions) => options?.separator ?? DEFAULT_PATH_SEPARATOR

type TreeNode = { el: Element, id: string, children: TreeNode[] }

export interface TargetTree {
  /** The path of the given `element`, null is it isn't present */
  pathOf(element: Element): string | null
  /** Every target path in the map, parents before their children. */
  paths(): string[]
}

export function buildTargetTree(parentElement: Element, opts?: TargetOptions): TargetTree {
  const attr = attributeName(opts)
  const sprtr = separator(opts)

  const roots: TreeNode[] = []
  const nodes = new Map<Element, TreeNode>()
  for (const el of parentElement.querySelectorAll(targetSelector(attr))) {
    const node: TreeNode = { el, id: targetAttributeValue(el, attr)!, children: [] }
    const parent = nodes.get(closestTarget(el.parentElement, attr)!)
    ;(parent?.children ?? roots).push(node)
    nodes.set(el, node)
  }

  // siblings sharing an id get an index, unique ids don't.
  const pathByElement = new Map<Element, string>()
  const assignPaths = (siblings: TreeNode[], prefix: string) => {
    const counts = new Map<string, number>()
    for (const { id } of siblings) {
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const seen = new Map<string, number>()
    for (const node of siblings) {
      const n = seen.get(node.id) ?? 0
      seen.set(node.id, n + 1)
      const path = prefix + (counts.get(node.id)! > 1 ? `${node.id}[${n}]` : node.id)
      pathByElement.set(node.el, path)
      assignPaths(node.children, path + sprtr)
    }
  }
  assignPaths(roots, '')

  return {
    pathOf: element => pathByElement.get(element) ?? null,
    paths: () => [...pathByElement.values()],
  }
}

/** Resolves a path to its element in the root */
export function findTargetByPath(pathComponents: string[]|string, opts?: TargetOptions): Element | null {
  const components = Array.isArray(pathComponents) ? [...pathComponents] : pathComponents.split(separator(opts))
  if (components.length === 0 || components.some(c => !c)) return null
  const attr = attributeName(opts)
  const root = opts?.root ?? document
  let finalTarget = findChildTarget(root, components.shift()!, attr)
  while (finalTarget && components.length > 0) {
    finalTarget = findChildTarget(finalTarget, components.shift()!, attr)
  }
  return finalTarget
}

function findChildTarget(container: ParentNode, path: string, attr = DEFAULT_TARGET_ATTRIBUTE): Element | null {
  const isDirectTarget = (el: Element) => {
    const owner = closestTarget(el.parentElement, attr)
    return !owner || owner === container || !container.contains(owner)
  }
  const matches = path.match(/^([^\[\]]+)\[([0-9]+)\]$/) // for example: 'link[3]'
  if (matches) {
    path = matches[1]!
    const index = parseInt(matches[2]!)
    return Array.from(container.querySelectorAll(targetIdSelector(path, attr))).filter(isDirectTarget)[index] ?? null
  } else {
    return Array.from(container.querySelectorAll(targetIdSelector(path, attr))).find(isDirectTarget) ?? null
  }
}

/** Styleable descendants of `el` that belong to it, i.e. not inside a nested target. */
export function ownedDescendants(el: Node, attr = DEFAULT_TARGET_ATTRIBUTE): (Element & ElementCSSInlineStyle)[] {
  let descendants: (Element & ElementCSSInlineStyle)[] = []
  for (const child of el.childNodes) {
    if (child instanceof Element && targetAttributeValue(child, attr)) continue
    if (child instanceof Element && 'style' in child && child.style) {
      descendants.push(child as Element & ElementCSSInlineStyle)
    }
    descendants = descendants.concat(ownedDescendants(child, attr))
  }
  return descendants
}
