import { type InspectedResult } from './inspect'

export interface SerializedSelection {
  element: string
  path: InspectedResult['path']
  targetTree: InspectedResult['targetTree']
  variables: InspectedResult['variables']
}

/** Converts an inspection into postMessage-safe data. */
export function serializeInspection(result: InspectedResult): SerializedSelection {
  return {
    element: result.element.tagName,
    path: result.path,
    targetTree: result.targetTree,
    variables: result.variables
  }
}
