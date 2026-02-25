-- 관리자 권한: 웹사이트 운영자가 모든 글 수정/삭제 가능하도록 설정
-- Supabase 대시보드 → SQL Editor에서 이 스크립트를 실행하세요.

-- 1) 관리자 목록 테이블 (이 테이블에 있는 user_id = 로그인한 사용자면 관리자)
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 관리자만 admins 테이블 조회 가능 (본인이 관리자인지 확인용)
CREATE POLICY "admins_select_own"
  ON public.admins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2) posts 테이블 RLS가 꺼져 있으면 켜기
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 3) posts 조회·작성 정책 (RLS를 처음 켤 때 필요)
DROP POLICY IF EXISTS "posts_select_all" ON public.posts;
CREATE POLICY "posts_select_all"
  ON public.posts FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "posts_insert_authenticated" ON public.posts;
CREATE POLICY "posts_insert_authenticated"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- 4) "작성자 또는 admins에 있는 사용자"만 수정/삭제 가능

-- 작성자 또는 관리자만 수정
DROP POLICY IF EXISTS "posts_update_author_or_admin" ON public.posts;
CREATE POLICY "posts_update_author_or_admin"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR auth.uid() IN (SELECT user_id FROM public.admins)
  )
  WITH CHECK (true);

-- 작성자 또는 관리자만 삭제
DROP POLICY IF EXISTS "posts_delete_author_or_admin" ON public.posts;
CREATE POLICY "posts_delete_author_or_admin"
  ON public.posts FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- 5) 본인을 관리자로 등록
--    Supabase 대시보드 → Authentication → Users 에서 본인 계정의 UUID 복사 후
--    아래 한 줄의 주석을 해제하고 'YOUR_USER_ID'를 그 UUID로 바꾼 뒤 실행하세요.
-- INSERT INTO public.admins (user_id) VALUES ('YOUR_USER_ID'::uuid);

-- ※ 이미 posts에 다른 정책이 있어 오류가 나면, Table Editor → posts → Policies에서
--    기존 정책과 겹치지 않게 수정하거나 정책 이름을 바꿔 적용하세요.
