/**
 * Generate a blur data URL for lazy loading placeholders
 * Creates a tiny base64-encoded SVG for blur-up effect
 */
export const generateBlurDataURL = (
  width: number = 10,
  height: number = 10,
  color: string = '#1e293b' // slate-800
): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${color}"/>
    </svg>
  `;
  
  // Convert to base64
  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
};

/**
 * Generate a gradient blur placeholder
 * Creates a nice gradient effect for loading states
 */
export const generateGradientBlur = (
  width: number = 10,
  height: number = 10,
  fromColor: string = '#1e293b',
  toColor: string = '#0f172a'
): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${fromColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${toColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
    </svg>
  `;
  
  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
};

/**
 * Extract dominant color from image URL (simplified version)
 * In production, this would use Canvas API or a service
 */
export const getImagePlaceholder = (imageUrl?: string): string => {
  if (!imageUrl) {
    return generateBlurDataURL();
  }

  // Generate different colors based on URL hash for variety
  const hash = imageUrl.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const hue = Math.abs(hash) % 360;
  const saturation = 20 + (Math.abs(hash) % 30); // 20-50%
  const lightness = 15 + (Math.abs(hash) % 10); // 15-25%

  const fromColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const toColor = `hsl(${(hue + 30) % 360}, ${saturation}%, ${lightness - 5}%)`;

  return generateGradientBlur(10, 10, fromColor, toColor);
};
