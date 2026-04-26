export const API_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${API_URL}${path}`, options);
}
