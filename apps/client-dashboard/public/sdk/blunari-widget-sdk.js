/**
 * Blunari Widget SDK - Enterprise-grade widget embedding solution
 * Provides secure, performant, and feature-rich widget integration
 */

class BlunariWidgetSDK {
  constructor(config = {}) {
    this.widgets = new Map()
    this.apiUrl = config.apiUrl || 'https://app.blunari.com'
    this.sessionId = this.generateSessionId()
    this.errorHandler = this.defaultErrorHandler
    this.performanceObserver = null
    
    // Initialize performance monitoring
    this.initializePerformanceMonitoring()
    
    // Initialize error tracking
    this.initializeErrorTracking()
    
    if (config.debug) {
      console.log('[Blunari SDK] Initialized with session:', this.sessionId)
    }
  }

  static getInstance(config = {}) {
    if (!BlunariWidgetSDK.instance) {
      BlunariWidgetSDK.instance = new BlunariWidgetSDK(config)
    }
    return BlunariWidgetSDK.instance
  }

  /**
   * Create and embed a widget
   */
  async createWidget(config) {
    try {
      // Validate configuration
      this.validateConfig(config)
      
      // Get container element
      const container = this.getContainer(config.container)
      
      // Verify widget token
      await this.verifyWidgetToken(config.widgetId, config.token)
      
      // Create iframe with security measures
      const iframe = this.createSecureIframe(config)
      
      // Create widget instance
      const instance = {
        id: this.generateWidgetId(),
        iframe,
        config,
        destroy: () => this.destroyWidget(instance.id),
        reload: () => this.reloadWidget(instance.id),
        updateTheme: (theme) => this.updateWidgetTheme(instance.id, theme),
        sendMessage: (type, data) => this.sendWidgetMessage(instance.id, type, data),
        resize: () => this.resizeWidget(instance.id),
        getMetrics: () => this.getWidgetMetrics(instance.id)
      }

      // Setup iframe event listeners
      this.setupIframeEventListeners(iframe, instance)

      // Insert iframe into container
      container.appendChild(iframe)

      // Register widget instance
      this.widgets.set(instance.id, instance)

      // Track widget creation
      if (config.analytics !== false) {
        this.trackEvent('view', {
          widget_id: config.widgetId,
          load_time: performance.now()
        })
      }

      // Call onLoad callback
      iframe.onload = () => {
        if (config.onLoad) config.onLoad()
        
        // Track load performance
        if (config.performance !== false) {
          this.trackPerformance(instance.id, 'load')
        }
      }

      return instance

    } catch (error) {
      this.errorHandler(error)
      if (config.onError) config.onError(error)
      throw error
    }
  }

  /**
   * Validate widget configuration
   */
  validateConfig(config) {
    if (!config.widgetId) {
      throw new Error('Widget ID is required')
    }
    
    if (!config.token) {
      throw new Error('Widget token is required')
    }

    // Validate token format (basic check)
    if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(config.token)) {
      throw new Error('Invalid token format')
    }
  }

  /**
   * Get container element
   */
  getContainer(container) {
    if (!container) {
      throw new Error('Container is required')
    }

    if (typeof container === 'string') {
      const element = document.querySelector(container)
      if (!element) {
        throw new Error(`Container element not found: ${container}`)
      }
      return element
    }

    return container
  }

  /**
   * Verify widget token with backend
   */
  async verifyWidgetToken(widgetId, token) {
    try {
      const response = await fetch(`${this.apiUrl}/api/widgets/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ widgetId })
      })

      if (!response.ok) {
        throw new Error(`Token verification failed: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.valid) {
        throw new Error('Invalid widget token')
      }
    } catch (error) {
      throw new Error(`Failed to verify widget token: ${error}`)
    }
  }

  /**
   * Create secure iframe for widget
   */
  createSecureIframe(config) {
    const iframe = document.createElement('iframe')
    
    // Basic iframe attributes
    iframe.src = this.buildWidgetUrl(config)
    iframe.style.width = '100%'
    iframe.style.height = '400px'
    iframe.style.border = 'none'
    iframe.style.display = 'block'
    
    // Security attributes
    iframe.loading = 'lazy'
    iframe.importance = 'low'
    
    // Sandbox for security (if enabled)
    if (config.sandbox !== false) {
      iframe.sandbox.add(
        'allow-scripts',
        'allow-same-origin',
        'allow-forms',
        'allow-popups',
        'allow-popups-to-escape-sandbox'
      )
    }

    // CSP nonce if provided
    if (config.csp && config.csp.nonce) {
      iframe.setAttribute('nonce', config.csp.nonce)
    }

    // Additional security headers
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
    iframe.setAttribute('allow', 'payment; geolocation')

    return iframe
  }

  /**
   * Build widget URL with parameters
   */
  buildWidgetUrl(config) {
    const params = new URLSearchParams({
      widget_id: config.widgetId,
      token: config.token,
      session_id: this.sessionId,
      theme: config.theme || 'auto',
      auto_resize: String(config.autoResize !== false),
      analytics: String(config.analytics !== false),
      performance: String(config.performance !== false),
      sdk_version: '1.0.0'
    })

    if (config.customStyles) {
      params.set('custom_styles', btoa(config.customStyles))
    }

    return `${this.apiUrl}/widgets/embed?${params.toString()}`
  }

  /**
   * Setup iframe event listeners
   */
  setupIframeEventListeners(iframe, instance) {
    const messageHandler = (event) => {
      // Verify origin for security
      if (!this.isValidOrigin(event.origin)) {
        return
      }

      const { type, data, widgetId } = event.data

      // Ensure message is for this widget
      if (widgetId !== instance.config.widgetId) {
        return
      }

      switch (type) {
        case 'resize':
          this.handleWidgetResize(instance, data)
          break
          
        case 'interaction':
          this.handleWidgetInteraction(instance, data)
          break
          
        case 'conversion':
          this.handleWidgetConversion(instance, data)
          break
          
        case 'error':
          this.handleWidgetError(instance, data)
          break
          
        case 'ready':
          this.handleWidgetReady(instance)
          break
      }
    }

    window.addEventListener('message', messageHandler)
    iframe.dataset.messageHandler = 'attached'
  }

  /**
   * Handle widget resize
   */
  handleWidgetResize(instance, data) {
    if (instance.config.autoResize !== false) {
      instance.iframe.style.height = `${data.height}px`
      
      if (data.width) {
        instance.iframe.style.width = `${data.width}px`
      }
    }

    if (instance.config.onResize) {
      instance.config.onResize(data)
    }
  }

  /**
   * Handle widget interaction
   */
  handleWidgetInteraction(instance, data) {
    // Track interaction
    this.trackEvent('interaction', {
      widget_id: instance.config.widgetId,
      interaction_data: data
    })

    if (instance.config.onInteraction) {
      instance.config.onInteraction('interaction', data)
    }
  }

  /**
   * Handle widget conversion
   */
  handleWidgetConversion(instance, data) {
    // Track conversion
    this.trackEvent('conversion', {
      widget_id: instance.config.widgetId,
      conversion_data: data
    })

    if (instance.config.onConversion) {
      instance.config.onConversion(data)
    }
  }

  /**
   * Handle widget error
   */
  handleWidgetError(instance, data) {
    const error = new Error(`Widget error: ${data.message}`)
    
    // Track error
    this.trackEvent('error', {
      widget_id: instance.config.widgetId,
      error_message: data.message,
      error_stack: data.stack
    })

    if (instance.config.onError) {
      instance.config.onError(error)
    }
  }

  /**
   * Handle widget ready
   */
  handleWidgetReady(instance) {
    if (instance.config.debug) {
      console.log('[Blunari SDK] Widget ready:', instance.id)
    }
  }

  /**
   * Track analytics event
   */
  async trackEvent(eventType, data) {
    try {
      const event = {
        event_type: eventType,
        event_data: data,
        user_session: this.sessionId,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }

      // Send to analytics endpoint
      fetch(`${this.apiUrl}/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event),
        keepalive: true
      }).catch(() => {
        // Fail silently for analytics
      })
    } catch {
      // Fail silently
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(widgetId, metric) {
    if (this.performanceObserver) {
      const entries = performance.getEntriesByType('measure')
      const relevantEntries = entries.filter(entry => 
        entry.name.includes(widgetId) || entry.name.includes(metric)
      )

      if (relevantEntries.length > 0) {
        this.trackEvent('performance', {
          widget_id: widgetId,
          metric,
          performance_entries: relevantEntries.map(entry => ({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
          }))
        })
      }
    }
  }

  /**
   * Initialize performance monitoring
   */
  initializePerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        // Process performance entries
      })

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource'] 
      })
    }
  }

  /**
   * Initialize error tracking
   */
  initializeErrorTracking() {
    window.addEventListener('error', (event) => {
      if ((event.filename && event.filename.includes('blunari')) || 
          (event.message && event.message.includes('widget'))) {
        this.trackEvent('error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error ? event.error.toString() : null
        })
      }
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('error', {
        type: 'unhandled_promise_rejection',
        reason: event.reason ? event.reason.toString() : null
      })
    })
  }

  /**
   * Validate origin for security
   */
  isValidOrigin(origin) {
    const allowedOrigins = [
      'https://app.blunari.com',
      'https://widgets.blunari.com',
      'https://staging.blunari.com'
    ]
    
    return allowedOrigins.includes(origin)
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `sdk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique widget ID
   */
  generateWidgetId() {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Default error handler
   */
  defaultErrorHandler(error) {
    if (console && console.error) {
      console.error('[Blunari SDK Error]:', error)
    }
  }

  /**
   * Destroy widget instance
   */
  destroyWidget(instanceId) {
    const instance = this.widgets.get(instanceId)
    if (!instance) return

    // Remove iframe
    instance.iframe.remove()

    // Remove from registry
    this.widgets.delete(instanceId)
  }

  /**
   * Reload widget
   */
  reloadWidget(instanceId) {
    const instance = this.widgets.get(instanceId)
    if (!instance) return

    instance.iframe.src = this.buildWidgetUrl(instance.config)
  }

  /**
   * Update widget theme
   */
  updateWidgetTheme(instanceId, theme) {
    const instance = this.widgets.get(instanceId)
    if (!instance) return

    this.sendWidgetMessage(instanceId, 'theme_update', { theme })
  }

  /**
   * Send message to widget
   */
  sendWidgetMessage(instanceId, type, data) {
    const instance = this.widgets.get(instanceId)
    if (!instance) return

    if (instance.iframe.contentWindow) {
      instance.iframe.contentWindow.postMessage({
        type,
        data,
        source: 'blunari_sdk'
      }, this.apiUrl)
    }
  }

  /**
   * Resize widget
   */
  resizeWidget(instanceId) {
    const instance = this.widgets.get(instanceId)
    if (!instance) return

    this.sendWidgetMessage(instanceId, 'resize_request', {})
  }

  /**
   * Get widget performance metrics
   */
  async getWidgetMetrics(instanceId) {
    const instance = this.widgets.get(instanceId)
    if (!instance) throw new Error('Widget instance not found')

    // Return cached or fetch new metrics
    return {
      loadTime: 0,
      renderTime: 0,
      interactions: 0,
      errors: [],
      performance: []
    }
  }

  /**
   * Get all active widgets
   */
  getActiveWidgets() {
    return Array.from(this.widgets.values())
  }

  /**
   * Destroy all widgets
   */
  destroyAllWidgets() {
    this.widgets.forEach(instance => instance.destroy())
    this.widgets.clear()
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  window.BlunariSDK = BlunariWidgetSDK
  window.blunari = BlunariWidgetSDK.getInstance()
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlunariWidgetSDK
}