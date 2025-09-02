// Live Booking Widget Embed Script
(function () {
  "use strict";

  // Configuration
  const WIDGET_BASE_URL = window.location.origin;

  // Get the current script element to extract configuration
  const currentScript =
    document.currentScript ||
    (function () {
      const scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  // Extract configuration from script tag data attributes
  const config = {
    slug: currentScript.getAttribute("data-slug") || "demo-restaurant",
    theme: currentScript.getAttribute("data-theme") || "default",
    width: currentScript.getAttribute("data-width") || "100%",
    height: currentScript.getAttribute("data-height") || "600px",
    border: currentScript.getAttribute("data-border") === "true",
    rounded: currentScript.getAttribute("data-rounded") === "true",
  };

  // Validate required configuration
  if (!config.slug) {
    console.error("Booking Widget: data-slug attribute is required");
    return;
  }

  // Create widget container
  function createWidget() {
    const container = document.createElement("div");
    container.id = "booking-widget-" + Math.random().toString(36).substr(2, 9);
    container.style.cssText = `
      width: ${config.width};
      height: ${config.height};
      ${config.border ? "border: 1px solid #e5e7eb;" : ""}
      ${config.rounded ? "border-radius: 12px;" : ""}
      overflow: hidden;
      position: relative;
      background: #f9fafb;
    `;

    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.src = `${WIDGET_BASE_URL}/book/${encodeURIComponent(config.slug)}`;
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    `;
    iframe.frameBorder = "0";
    iframe.allowTransparency = "true";
    iframe.scrolling = "auto";

    // Add loading message
    const loadingDiv = document.createElement("div");
    loadingDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #6b7280;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    loadingDiv.innerHTML = `
      <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top: 2px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 8px;"></div>
      <div>Loading booking widget...</div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    container.appendChild(loadingDiv);
    container.appendChild(iframe);

    // Hide loading when iframe loads
    iframe.onload = function () {
      loadingDiv.style.display = "none";
    };

    // Error handling
    iframe.onerror = function () {
      loadingDiv.innerHTML = `
        <div style="color: #ef4444;">
          <div style="font-weight: 600; margin-bottom: 4px;">Unable to load booking widget</div>
          <div style="font-size: 14px;">Please check your connection and try again</div>
        </div>
      `;
    };

    return container;
  }

  // Insert widget after current script
  function insertWidget() {
    const widget = createWidget();

    // Insert after the current script
    if (currentScript.parentNode) {
      currentScript.parentNode.insertBefore(widget, currentScript.nextSibling);
    } else {
      // Fallback: append to body
      document.body.appendChild(widget);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertWidget);
  } else {
    insertWidget();
  }

  // Global API for programmatic control
  window.BookingWidget = window.BookingWidget || {
    create: function (elementId, options) {
      const element = document.getElementById(elementId);
      if (!element) {
        console.error("Booking Widget: Element not found:", elementId);
        return;
      }

      const mergedConfig = Object.assign({}, config, options);
      const widget = createWidget();
      element.appendChild(widget);

      return {
        element: widget,
        reload: function () {
          const iframe = widget.querySelector("iframe");
          if (iframe) {
            iframe.src = iframe.src;
          }
        },
        destroy: function () {
          if (widget.parentNode) {
            widget.parentNode.removeChild(widget);
          }
        },
      };
    },

    // Utility to check if restaurant is available
    checkAvailability: function (slug, callback) {
      fetch(
        `${WIDGET_BASE_URL}/api/tenants/by-slug/${encodeURIComponent(slug)}`,
      )
        .then((response) => response.json())
        .then((data) => callback(null, data))
        .catch((error) => callback(error, null));
    },
  };
})();

// Usage examples:
// <script src="/widget/booking.js" data-slug="your-restaurant-slug"></script>
// Or programmatically: BookingWidget.create('my-div', { slug: 'restaurant-slug' });
