type Loader = () => Promise<unknown>;

const routeToLoader = new Map<string, Loader>();

export function registerRoutePrefetch(path: string, loader: Loader): void {
  routeToLoader.set(path, loader);
}

export function prefetchRoute(path: string): void {
  const loader = routeToLoader.get(path);
  if (!loader) return;
  try {
    // Schedule lightly to avoid blocking user input
      if (typeof (window as any).requestIdleCallback === 'function') {
      (window as any).requestIdleCallback(() => loader().catch(() => {}), { timeout: 1500 });
    } else {
      setTimeout(() => loader().catch(() => {}), 200);
    }
  } catch {}
}

export function prefetchAll(paths: string[]): void {
  paths.forEach(prefetchRoute);
}



