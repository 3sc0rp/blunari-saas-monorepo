// Generic shallow equality check for plain objects (no prototype / symbol handling)
export function shallowEqual<T extends Record<string, any>>(a: T | null | undefined, b: T | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) {
    const k = ak[i];
    if (a[k] !== (b as any)[k]) return false;
  }
  return true;
}
export default shallowEqual;
