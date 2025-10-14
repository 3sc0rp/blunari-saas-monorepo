/**
 * Service Worker Registration
 * Handles registration and lifecycle management of the service worker
 */

/**
 * Check if we're in a sandboxed context where service workers are not allowed
 */
function isServiceWorkerAllowed(): boolean {
  try {
    // Check if we're in a sandboxed iframe
    if (window.self !== window.top) {
      // In iframe - service workers may be blocked
      return false;
    }
    
    // Try to access the serviceWorker property
    // In sandboxed contexts, this will throw a SecurityError
    if ('serviceWorker' in navigator) {
      // Access the property to trigger any security errors
      const sw = navigator.serviceWorker;
      return sw !== undefined;
    }
    
    return false;
  } catch (error) {
    // SecurityError or other error means service workers are not allowed    return false;
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  // Only register in production
  if (import.meta.env.DEV) {    return undefined;
  }

  // Check if service worker is allowed in this context
  if (!isServiceWorkerAllowed()) {    return undefined;
  }

  // Check browser support (redundant but safe)
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service workers not supported in this browser');
    return undefined;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker installed and ready          // Notify user about update
          notifyUpdate(registration);
        }
      });
    });

    // Check for updates periodically (every hour)
    setInterval(() => {
      registration.update().catch((error) => {
        console.warn('[SW] Update check failed:', error);
      });
    }, 60 * 60 * 1000);

    // Listen for controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {      window.location.reload();
    });

    return registration;

  } catch (error) {
    console.error('[SW] Service worker registration failed:', error);
    return undefined;
  }
}

/**
 * Unregister service worker (for development or debugging)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerAllowed()) {
    return false;
  }

  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();      return success;
    }
    return false;
  } catch (error) {
    console.error('[SW] Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));  } catch (error) {
    console.error('[SW] Failed to clear caches:', error);
  }
}

/**
 * Notify user about service worker update
 */
function notifyUpdate(registration: ServiceWorkerRegistration): void {
  // Create update notification
  const updateBanner = document.createElement('div');
  updateBanner.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4f46e5;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;

  updateBanner.innerHTML = `
    <div>
      <div style="font-weight: 600; margin-bottom: 4px;">Update Available</div>
      <div style="opacity: 0.9;">A new version of Blunari is ready</div>
    </div>
    <button id="sw-update-btn" style="
      background: white;
      color: #4f46e5;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
    ">
      Update Now
    </button>
  `;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(updateBanner);

  // Handle update button click
  const updateBtn = document.getElementById('sw-update-btn');
  updateBtn?.addEventListener('click', () => {
    // Tell the service worker to skip waiting
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    updateBanner.remove();
  });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    updateBanner.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => updateBanner.remove(), 300);
  }, 10000);
}

/**
 * Get service worker status
 */
export async function getServiceWorkerStatus(): Promise<{
  supported: boolean;
  registered: boolean;
  active: boolean;
  waiting: boolean;
}> {
  if (!isServiceWorkerAllowed()) {
    return {
      supported: false,
      registered: false,
      active: false,
      waiting: false,
    };
  }

  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      registered: false,
      active: false,
      waiting: false,
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    return {
      supported: true,
      registered: !!registration,
      active: !!registration?.active,
      waiting: !!registration?.waiting,
    };
  } catch (error) {
    console.warn('[SW] Failed to get service worker status:', error);
    return {
      supported: false,
      registered: false,
      active: false,
      waiting: false,
    };
  }
}

