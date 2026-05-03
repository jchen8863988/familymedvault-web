import { createPublicSupabase, isSupabaseConfigured } from "@/lib/supabase/public";
import type { CommunityIdeaRow } from "@/types/community";

type RawIdea = {
  id: string;
  title: string;
  body: string;
  author_name: string | null;
  author_email: string | null;
  created_at: string;
  idea_votes: { count: number }[] | null;
  idea_comments: { count: number }[] | null;
};

function nestedCount(
  nested: { count: number }[] | null | undefined,
): number {
  if (!nested?.length) return 0;
  return nested[0]?.count ?? 0;
}

export async function fetchCommunityIdeas(): Promise<{
  configured: boolean;
  ideas: CommunityIdeaRow[];
}> {
  if (!isSupabaseConfigured()) {
    return { configured: false, ideas: [] };
  }

  const supabase = createPublicSupabase();
  if (!supabase) {
    return { configured: false, ideas: [] };
  }

  const { data, error } = await supabase
    .from("community_ideas")
    .select(
      `
      id,
      title,
      body,
      author_name,
      author_email,
      created_at,
      idea_votes(count),
      idea_comments(count)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[community] fetch ideas", error.message);
    return { configured: true, ideas: [] };
  }

  const rows = (data ?? []) as RawIdea[];
  const ideas: CommunityIdeaRow[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    author_name: row.author_name,
    author_email: row.author_email,
    created_at: row.created_at,
    vote_count: nestedCount(row.idea_votes),
    comment_count: nestedCount(row.idea_comments),
  }));

  return { configured: true, ideas };
}
