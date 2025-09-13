/**
 * Blunari Widget SDK TypeScript Declarations
 */

export interface BlunariWidgetConfig {
  widgetId: string
  token: string
  container?: string | HTMLElement
  theme?: 'light' | 'dark' | 'auto'
  autoResize?: boolean
  sandbox?: boolean
  analytics?: boolean
  onLoad?: () => void
  onError?: (error: Error) => void
  onResize?: (size: { width: number; height: number }) => void
  onInteraction?: (event: string, data: any) => void
  onConversion?: (data: any) => void
  performance?: boolean
  csp?: {
    nonce?: string
    allowedOrigins?: string[]
  }
  customStyles?: string
  debug?: boolean
}

export interface WidgetInstance {
  id: string
  iframe: HTMLIFrameElement
  config: BlunariWidgetConfig
  destroy(): void
  reload(): void
  updateTheme(theme: 'light' | 'dark'): void
  sendMessage(type: string, data: any): void
  resize(): void
  getMetrics(): Promise<WidgetMetrics>
}

export interface WidgetMetrics {
  loadTime: number
  renderTime: number
  interactions: number
  errors: string[]
  performance: PerformanceEntry[]
}

export interface SDKConfig {
  apiUrl?: string
  debug?: boolean
}

export declare class BlunariWidgetSDK {
  constructor(config?: SDKConfig)
  static getInstance(config?: SDKConfig): BlunariWidgetSDK
  createWidget(config: BlunariWidgetConfig): Promise<WidgetInstance>
  getActiveWidgets(): WidgetInstance[]
  destroyAllWidgets(): void
}

declare global {
  interface Window {
    BlunariSDK: typeof BlunariWidgetSDK
    blunari: BlunariWidgetSDK
  }
}

export default BlunariWidgetSDK