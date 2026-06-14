const USER_ID_KEY = "ampnest_web_user_id";
const USER_IDS_KEY = "ampnest_web_user_ids";
const USER_NAME_KEY = "ampnest_web_user_name";
const USER_EMAIL_KEY = "ampnest_web_user_email";

export function getOrCreateWebUserId(): string {
  if (typeof window === "undefined") return `web-${Date.now()}`;
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = `web-${Date.now()}`;
    localStorage.setItem(USER_ID_KEY, id);
    rememberWebUserId(id);
  }
  return id;
}

export function getRememberedWebUserIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_IDS_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    const current = localStorage.getItem(USER_ID_KEY);
    return current && !list.includes(current) ? [...list, current] : list;
  } catch {
    return [];
  }
}

export function rememberWebUserId(id: string): void {
  if (typeof window === "undefined" || !id.startsWith("web-")) return;
  const ids = getRememberedWebUserIds();
  if (!ids.includes(id)) {
    localStorage.setItem(USER_IDS_KEY, JSON.stringify([...ids, id]));
  }
}

export function getSavedUserName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(USER_NAME_KEY) ?? "";
}

export function saveUserName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (trimmed) localStorage.setItem(USER_NAME_KEY, trimmed);
}

export function getSavedUserEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(USER_EMAIL_KEY) ?? "";
}

export function saveUserEmail(email: string): void {
  if (typeof window === "undefined") return;
  const trimmed = email.trim();
  if (trimmed) localStorage.setItem(USER_EMAIL_KEY, trimmed);
}
