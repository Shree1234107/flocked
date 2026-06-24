// localStorage-backed shim matching the expo-secure-store async API.
// Data is not encrypted on web — acceptable for a dev/preview environment.

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export async function deleteItemAsync(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch {}
}
