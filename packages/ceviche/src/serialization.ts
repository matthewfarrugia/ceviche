import { type InspectedResult } from './inspect'

export interface SerializedSelection {
  element: string
  variables: InspectedResult['variables']
}

/** Converts an inspection into postMessage-safe data. */
export function serializeInspection(result: InspectedResult): SerializedSelection {
  return {
    element: result.element.tagName,
    variables: result.variables
  }
}
