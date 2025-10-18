export interface FilterPreset<T> {
  id: string;
  name: string;
  value: T;
  createdAt: string;
}

function keyFor(scope: string) {
  return `blunari:presets:${scope}`;
}

export function listPresets<T>(scope: string): FilterPreset<T>[] {
  try {
    const raw = localStorage.getItem(keyFor(scope));
    if (!raw) return [];
    const arr = JSON.parse(raw) as FilterPreset<T>[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function savePreset<T>(scope: string, name: string, value: T): FilterPreset<T> {
  const preset: FilterPreset<T> = {
    id: crypto.randomUUID(),
    name,
    value,
    createdAt: new Date().toISOString(),
  };
  const items = listPresets<T>(scope);
  items.unshift(preset);
  localStorage.setItem(keyFor(scope), JSON.stringify(items.slice(0, 20)));
  return preset;
}

export function deletePreset(scope: string, id: string) {
  const items = listPresets(scope).filter((p) => p.id !== id);
  localStorage.setItem(keyFor(scope), JSON.stringify(items));
}

