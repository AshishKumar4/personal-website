const TOKEN_KEY = 'authToken';
export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error("Could not save auth token to local storage", error);
  }
}
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error("Could not retrieve auth token from local storage", error);
    return null;
  }
}
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("Could not clear auth token from local storage", error);
  }
}