const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// tiny wrapper around fetch - attaches the access token, and on a 401 tries a single
// refresh-and-retry before giving up. keeps token handling out of every page component.
export async function apiFetch(path: string, options: RequestInit = {}, retry = true): Promise<any> {
  const accessToken = localStorage.getItem('accessToken');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch(path, options, false);
    }
  }

  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'request failed');
  }
  return data;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return false;
  }

  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return true;
}
