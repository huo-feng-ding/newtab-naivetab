/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { ProtocolWithReturn } from 'webext-bridge'
import { DefineComponent } from 'vue'

declare module '*.vue' {
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.md' {
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'webext-bridge' {
  export interface ProtocolMap {
    // define message protocol types
    // see https://github.com/antfu/webext-bridge#type-safe-protocols
    'tab-prev': { title: string | undefined }
    'get-current-tab': ProtocolWithReturn<{ tabId: number }, { title?: string }>
  }
}
