import type { Post } from "@/lib/types"
import { supabase } from "@/lib/supabase/client"

/** DB created_at → "방금 전", "5분 전" 등 표시용 문자열 */
function formatCreatedAt(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffSec < 60) return "방금 전"
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString("ko-KR")
}

/** DB 행 → 앱에서 쓰는 Post 타입으로 변환 */
function rowToPost(
  row: {
    id: string
    title: string
    content: string
    code?: string | null
    language?: string | null
    filename?: string | null
    tags: unknown
    author_id?: string | null
    author_name: string
    author_initial: string
    created_at: string
    likes: number
    comments: number
  },
  liked: boolean,
  bookmarked: boolean,
  favorited: boolean
): Post {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    code: row.code ?? undefined,
    language: row.language ?? undefined,
    filename: row.filename ?? undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    author: { name: row.author_name, initial: row.author_initial },
    authorId: row.author_id ?? undefined,
    createdAt: formatCreatedAt(row.created_at),
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    liked,
    bookmarked,
    favorited,
  }
}

/** 로그인한 사용자용: 모든 글 불러오기 (좋아요/북마크/즐겨찾기 상태 포함) */
export async function fetchPosts(userId: string): Promise<Post[]> {
  if (!supabase) return []

  const { data: rows, error: e1 } = await supabase
    .from("posts")
    .select("id, title, content, code, language, filename, tags, author_id, author_name, author_initial, created_at, likes, comments")
    .order("created_at", { ascending: false })

  if (e1 || !rows?.length) {
    if (e1) console.error("fetchPosts", e1)
    return []
  }

  const postIds = rows.map((r) => r.id)
  const [likesRes, bookmarksRes, favoritesRes] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", postIds),
    supabase.from("post_bookmarks").select("post_id").eq("user_id", userId).in("post_id", postIds),
    supabase.from("post_favorites").select("post_id").eq("user_id", userId).in("post_id", postIds),
  ])

  const likedSet = new Set((likesRes.data ?? []).map((r) => r.post_id))
  const bookmarkedSet = new Set((bookmarksRes.data ?? []).map((r) => r.post_id))
  const favoritedSet = new Set((favoritesRes.data ?? []).map((r) => r.post_id))

  return rows.map((row) =>
    rowToPost(
      row as Parameters<typeof rowToPost>[0],
      likedSet.has(row.id),
      bookmarkedSet.has(row.id),
      favoritedSet.has(row.id)
    )
  )
}

/** 새 글 저장 */
export async function createPost(
  post: Omit<Post, "id" | "createdAt" | "likes" | "comments" | "liked" | "bookmarked" | "favorited">,
  userId: string
): Promise<Post | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: post.title,
      content: post.content,
      code: post.code ?? null,
      language: post.language ?? null,
      filename: post.filename ?? null,
      tags: post.tags ?? [],
      author_id: userId,
      author_name: post.author.name,
      author_initial: post.author.initial,
      likes: 0,
      comments: 0,
    })
    .select("id, title, content, code, language, filename, tags, author_id, author_name, author_initial, created_at, likes, comments")
    .single()

  if (error) {
    console.error("createPost", error)
    return null
  }
  return rowToPost(data as Parameters<typeof rowToPost>[0], false, false, false)
}

/** 비로그인 사용자용: 모든 글 불러오기 (좋아요/북마크/즐겨찾기 상태 없이 읽기 전용) */
export async function fetchPostsPublic(): Promise<Post[]> {
  if (!supabase) return []

  const { data: rows, error } = await supabase
    .from("posts")
    .select("id, title, content, code, language, filename, tags, author_id, author_name, author_initial, created_at, likes, comments")
    .order("created_at", { ascending: false })

  if (error || !rows?.length) {
    if (error) console.error("fetchPostsPublic", error)
    return []
  }

  return rows.map((row) =>
    rowToPost(
      row as Parameters<typeof rowToPost>[0],
      false,
      false,
      false
    )
  )
}

/** 글 수정 (제목, 내용만). 작성자 또는 관리자(admins 테이블)만 가능. RLS로 권한 검사. */
export async function updatePost(
  postId: string,
  updates: { title: string; content: string },
  _userId: string
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from("posts")
    .update({ title: updates.title, content: updates.content })
    .eq("id", postId)
  if (error) console.error("updatePost", error)
  return !error
}

/** 글 삭제. 작성자 또는 관리자(admins 테이블)만 가능. RLS로 권한 검사. */
export async function deletePost(postId: string, _userId: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from("posts").delete().eq("id", postId)
  if (error) console.error("deletePost", error)
  return !error
}

/** 좋아요 토글 */
export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean): Promise<boolean> {
  if (!supabase) return false
  if (currentlyLiked) {
    const { error: e1 } = await supabase.from("post_likes").delete().eq("user_id", userId).eq("post_id", postId)
    if (e1) return false
    await supabase.rpc("decrement_post_likes", { p_post_id: postId })
  } else {
    const { error: e1 } = await supabase.from("post_likes").insert({ user_id: userId, post_id: postId })
    if (e1) return false
    await supabase.rpc("increment_post_likes", { p_post_id: postId })
  }
  return true
}

/** 북마크 토글 */
export async function toggleBookmark(postId: string, userId: string, currentlyBookmarked: boolean): Promise<boolean> {
  if (!supabase) return false
  if (currentlyBookmarked) {
    const { error } = await supabase.from("post_bookmarks").delete().eq("user_id", userId).eq("post_id", postId)
    return !error
  }
  const { error } = await supabase.from("post_bookmarks").insert({ user_id: userId, post_id: postId })
  return !error
}

/** Favorite 토글 */
export async function toggleFavorite(postId: string, userId: string, currentlyFavorited: boolean): Promise<boolean> {
  if (!supabase) return false
  if (currentlyFavorited) {
    const { error } = await supabase.from("post_favorites").delete().eq("user_id", userId).eq("post_id", postId)
    return !error
  }
  const { error } = await supabase.from("post_favorites").insert({ user_id: userId, post_id: postId })
  return !error
}
