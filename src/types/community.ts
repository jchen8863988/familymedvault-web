export type CommunityIdeaRow = {
  id: string;
  title: string;
  body: string;
  author_name: string | null;
  author_email: string | null;
  created_at: string;
  vote_count: number;
  comment_count: number;
};

export type IdeaCommentRow = {
  id: string;
  idea_id: string;
  body: string;
  author_name: string | null;
  created_at: string;
};
