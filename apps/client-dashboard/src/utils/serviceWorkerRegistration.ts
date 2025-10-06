/**
 * Service Worker Registration
 * Handles registration and lifecycle management of the service worker
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  // Only register in production
  if (import.meta.env.DEV) {
    console.log('[SW] Service worker disabled in development mode');
    return undefined;
  }

  // Check browser support
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service workers not supported in this browser');
    return undefined;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.log('[SW] Service worker registered successfully', {
      scope: registration.scope,
      active: !!registration.active,
    });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      console.log('[SW] New service worker found, installing...');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker installed and ready
          console.log('[SW] New service worker installed, update available');
          
          // Notify user about update
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
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed, reloading page...');
      window.location.reload();
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
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('[SW] Service worker unregistered:', success);
      return success;
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
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('[SW] All caches cleared');
  } catch (error) {
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
  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      registered: false,
      active: false,
      waiting: false,
    };
  }

  const registration = await navigator.serviceWorker.getRegistration();

  return {
    supported: true,
    registered: !!registration,
    active: !!registration?.active,
    waiting: !!registration?.waiting,
  };
}
