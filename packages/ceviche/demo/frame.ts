import { createFrameChannel, parentOriginFromLocation } from '../src'
import { defaultInspector } from '../src/inspector'
import { frame } from '../src/frame'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const parentOrigin = parentOriginFromLocation((origin) => LOCAL_HOSTS.has(new URL(origin).hostname))
if (!parentOrigin) throw new Error('No parent origin found')

const channel = createFrameChannel(parentOrigin)
frame(channel, { inspector: defaultInspector(channel) })
