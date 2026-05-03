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
