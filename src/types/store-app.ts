/** Row shape returned from `public.store_apps` (Supabase). */
export type StoreAppRow = {
  id: string;
  slug: string;
  name_en: string;
  name_zh: string;
  tagline_en: string | null;
  tagline_zh: string | null;
  platform_ios: boolean;
  platform_android: boolean;
  platform_web: boolean;
  app_store_url: string | null;
  google_play_url: string | null;
  web_url: string | null;
  sort_order: number;
};
