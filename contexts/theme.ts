export const DARK_MODE_COOKIE = "darkMode";

export type Theme = "light" | "dark";

export function getDarkModeCookie(): Theme {
  if (typeof document === "undefined") return "light";
  const match = document.cookie.match(new RegExp(`(?:^|; )${DARK_MODE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return value === "dark" ? "dark" : "light";
}

export function setDarkModeCookie(theme: Theme): void {
  document.cookie = `${DARK_MODE_COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}
