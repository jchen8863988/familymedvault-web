/** AmpNest web booking — env (mirror AmpNest EXPO_PUBLIC_* names). */
export function isAmpNestFirebaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_AMPNEST_FIREBASE_API_KEY);
}

export function getAmpNestFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_AMPNEST_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_AMPNEST_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_AMPNEST_FIREBASE_PROJECT_ID ?? "",
    databaseURL: process.env.NEXT_PUBLIC_AMPNEST_FIREBASE_DATABASE_URL ?? "",
    storageBucket: process.env.NEXT_PUBLIC_AMPNEST_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_AMPNEST_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_AMPNEST_FIREBASE_APP_ID ?? "",
  };
}

export function getAmpNestSmsWebhook(): string | undefined {
  const url = process.env.NEXT_PUBLIC_AMPNEST_SMS_WEBHOOK_URL;
  return url?.trim() || undefined;
}

export const AMPNEST_BOOK_PATH = "/ampnest/book";
