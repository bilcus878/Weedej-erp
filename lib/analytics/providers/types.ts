import type { InternalAnalyticsEvent, ProviderResult } from '../types'

export interface ProviderAdapter {
  readonly name: string
  readonly enabled: boolean
  send(event: InternalAnalyticsEvent): Promise<ProviderResult>
}
