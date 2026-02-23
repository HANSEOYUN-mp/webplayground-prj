-- Supabase SQL Editor에서 이 전체 내용을 붙여넣고 Run 실행하세요.
-- (Supabase 대시보드 → SQL Editor → New query → 붙여넣기 → Run)

-- 1. 게시글 테이블
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  code TEXT,
  language TEXT,
  filename TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_initial TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  likes INT DEFAULT 0 NOT NULL,
  comments INT DEFAULT 0 NOT NULL
);

-- 2. 좋아요 (누가 어떤 글에 좋아요 눌렀는지)
CREATE TABLE IF NOT EXISTS public.post_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

-- 3. 북마크
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

-- 4. 즐겨찾기 (Favorite)
CREATE TABLE IF NOT EXISTS public.post_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

-- 5. RLS 활성화
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_favorites ENABLE ROW LEVEL SECURITY;

-- 6. posts 정책: 로그인한 사용자는 모두 읽기, 본인만 작성/수정/삭제
CREATE POLICY "Anyone can read posts" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own post" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own post" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own post" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- 7. post_likes 정책
CREATE POLICY "Users can read post_likes" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own like" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own like" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 8. post_bookmarks 정책
CREATE POLICY "Users can read post_bookmarks" ON public.post_bookmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own bookmark" ON public.post_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmark" ON public.post_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 9. post_favorites 정책
CREATE POLICY "Users can read post_favorites" ON public.post_favorites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own favorite" ON public.post_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorite" ON public.post_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 10. 좋아요 개수 증감용 함수 (RLS 우회하여 likes 컬럼만 안전하게 변경)
CREATE OR REPLACE FUNCTION public.increment_post_likes(p_post_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.posts SET likes = likes + 1 WHERE id = p_post_id;
$$;
CREATE OR REPLACE FUNCTION public.decrement_post_likes(p_post_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.posts SET likes = GREATEST(0, likes - 1) WHERE id = p_post_id;
$$;
-- 로그인한 사용자가 이 함수 실행 가능하도록
GRANT EXECUTE ON FUNCTION public.increment_post_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_post_likes(UUID) TO authenticated;
