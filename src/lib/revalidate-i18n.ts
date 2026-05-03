import { revalidatePath } from "next/cache";

/** With `localePrefix: 'as-needed'`, English has no `/en` prefix; Chinese uses `/zh`. */
export function revalidateCommunityRoutes(): void {
  revalidatePath("/community");
  revalidatePath("/zh/community");
  revalidatePath("/");
  revalidatePath("/zh");
}

export function revalidateAdminRoutes(): void {
  revalidatePath("/community/admin");
  revalidatePath("/zh/community/admin");
}

export function revalidateAppsRoutes(): void {
  revalidatePath("/apps");
  revalidatePath("/zh/apps");
  revalidatePath("/apps/admin");
  revalidatePath("/zh/apps/admin");
}
