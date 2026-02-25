"use client"

import { useState, useMemo, useEffect } from "react"
import { Header, type NavTab } from "@/components/header"
import { PostCard } from "@/components/post-card"
import { SidebarPanel } from "@/components/sidebar-panel"
import { CreatePostModal } from "@/components/create-post-modal"
import { PostDetail } from "@/components/post-detail"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/contexts/auth-context"
import {
  fetchPosts,
  fetchPostsPublic,
  createPost,
  updatePost,
  deletePost as deletePostDb,
  toggleLike as toggleLikeDb,
  toggleBookmark as toggleBookmarkDb,
  toggleFavorite as toggleFavoriteDb,
} from "@/lib/supabase/posts"
import type { Post } from "@/lib/types"
import { StockDashboard } from "@/components/stock-dashboard"
import { Filter, PenLine } from "lucide-react"

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login")

  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest")
  const [activeTab, setActiveTab] = useState<NavTab>("feed")

  // 비로그인: 공개 글 목록 / 로그인: 본인용 글 목록(좋아요·북마크·즐겨찾기 포함)
  useEffect(() => {
    setPostsLoading(true)
    if (user?.id) {
      fetchPosts(user.id).then(setPosts).finally(() => setPostsLoading(false))
    } else {
      fetchPostsPublic().then(setPosts).finally(() => setPostsLoading(false))
    }
  }, [user?.id])

  /** 관리자(웹사이트 운영자) 이메일과 일치하면 모든 글 수정·삭제 가능 */
  const adminEmail = typeof process.env.NEXT_PUBLIC_ADMIN_EMAIL === "string"
    ? process.env.NEXT_PUBLIC_ADMIN_EMAIL.trim()
    : ""
  const isAdmin = !!user?.email && !!adminEmail && user.email.toLowerCase() === adminEmail.toLowerCase()

  const openAuthModal = (tab?: "login" | "signup") => {
    setAuthModalTab(tab ?? "login")
    setAuthModalOpen(true)
  }

  const filteredPosts = useMemo(() => {
    let result = posts

    if (activeTab === "favorite") {
      result = result.filter((post) => post.favorited === true)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query) ||
          post.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    if (selectedTag) {
      result = result.filter((post) =>
        post.tags.some((tag) => tag.toLowerCase() === selectedTag.toLowerCase())
      )
    }

    if (sortBy === "popular") {
      result = [...result].sort((a, b) => b.likes - a.likes)
    }

    return result
  }, [posts, activeTab, searchQuery, selectedTag, sortBy])

  const handleLike = async (id: string) => {
    const post = posts.find((p) => p.id === id)
    if (!post || !user?.id) return
    const ok = await toggleLikeDb(id, user.id, post.liked)
    if (ok)
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                liked: !p.liked,
                likes: p.liked ? p.likes - 1 : p.likes + 1,
              }
            : p
        )
      )
  }

  const handleBookmark = async (id: string) => {
    const post = posts.find((p) => p.id === id)
    if (!post || !user?.id) return
    const ok = await toggleBookmarkDb(id, user.id, post.bookmarked)
    if (ok)
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, bookmarked: !p.bookmarked } : p))
      )
  }

  const handleFavorite = async (id: string) => {
    const post = posts.find((p) => p.id === id)
    if (!post || !user?.id) return
    const ok = await toggleFavoriteDb(id, user.id, post.favorited)
    if (ok)
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, favorited: !p.favorited } : p))
      )
  }

  const handleCreatePost = async (newPost: Post) => {
    if (!user?.id) return
    const created = await createPost(
      {
        title: newPost.title,
        content: newPost.content,
        code: newPost.code,
        language: newPost.language,
        filename: newPost.filename,
        tags: newPost.tags,
        author: newPost.author,
      },
      user.id
    )
    if (created) {
      setPosts((prev) => [created, ...prev])
      setShowCreateModal(false)
    }
  }

  const handleDeletePost = async (id: string) => {
    if (!user?.id) return
    const ok = await deletePostDb(id, user.id)
    if (ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id))
      if (selectedPost?.id === id) setSelectedPost(null)
    }
  }

  const handleEditPost = async (updatedPost: Post) => {
    if (!user?.id) return
    const ok = await updatePost(
      updatedPost.id,
      { title: updatedPost.title, content: updatedPost.content },
      user.id
    )
    if (ok)
      setPosts((prev) =>
        prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
      )
  }

  // Get the up-to-date version of selectedPost from posts state
  const currentSelectedPost = selectedPost
    ? posts.find((p) => p.id === selectedPost.id) || selectedPost
    : null

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  // 비로그인: 글만 보기 (작성/수정/삭제·좋아요·북마크·즐겨찾기 불가)
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          onNewPost={() => {}}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTab="feed"
          onTabChange={() => {}}
          onOpenAuthModal={openAuthModal}
          isLoggedIn={false}
        />
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <StockDashboard />
          {currentSelectedPost ? (
            <PostDetail
              post={currentSelectedPost}
              onBack={() => setSelectedPost(null)}
              onLike={() => {}}
              onBookmark={() => {}}
              onFavorite={() => {}}
              onDelete={() => {}}
              onEdit={() => {}}
              canInteract={false}
              canEditAndDelete={false}
            />
          ) : (
            <div className="flex flex-col gap-8 lg:flex-row">
              <div className="flex-1">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      {selectedTag ? `#${selectedTag}` : "지식 피드"}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedTag ? `${selectedTag} 태그 게시글` : "커뮤니티와 함께 지식을 발견하세요. 새 글 작성·수정·삭제는 로그인 후 이용할 수 있어요."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                    <button
                      onClick={() => setSortBy("latest")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        sortBy === "latest" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      최신순
                    </button>
                    <button
                      onClick={() => setSortBy("popular")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        sortBy === "popular" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      인기순
                    </button>
                  </div>
                </div>
                {selectedTag && (
                  <div className="mb-4 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">필터:</span>
                    <button
                      onClick={() => setSelectedTag(null)}
                      className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/25"
                    >
                      #{selectedTag}
                      <span className="ml-1">x</span>
                    </button>
                  </div>
                )}
                {postsLoading ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16">
                    <p className="text-sm text-muted-foreground">글 불러오는 중...</p>
                  </div>
                ) : filteredPosts.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    {filteredPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onLike={() => {}}
                        onBookmark={() => {}}
                        onFavorite={() => {}}
                        onSelect={setSelectedPost}
                        onDelete={() => {}}
                        onEdit={() => {}}
                        canInteract={false}
                        canEditAndDelete={false}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <PenLine className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                      {posts.length === 0 ? "아직 게시글이 없습니다" : "게시글을 찾을 수 없습니다"}
                    </h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {posts.length === 0 ? "첫 번째 게시글은 로그인 후 작성할 수 있어요." : "검색어 또는 필터 조건을 변경해 보세요"}
                    </p>
                  </div>
                )}
              </div>
              <div className="w-full shrink-0 lg:w-80">
                <SidebarPanel
                  selectedTag={selectedTag}
                  onTagSelect={setSelectedTag}
                  posts={posts}
                  onPostSelect={setSelectedPost}
                />
              </div>
            </div>
          )}
        </main>
        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultTab={authModalTab}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        onNewPost={() => setShowCreateModal(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          if (tab === "favorite") {
            setSelectedTag(null)
            setSearchQuery("")
          }
        }}
        onOpenAuthModal={openAuthModal}
        isLoggedIn={true}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <StockDashboard />
        {currentSelectedPost ? (
          <PostDetail
            post={currentSelectedPost}
            onBack={() => setSelectedPost(null)}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onFavorite={handleFavorite}
            onDelete={handleDeletePost}
            onEdit={handleEditPost}
            canInteract={true}
            canEditAndDelete={currentSelectedPost.authorId === user?.id || isAdmin}
          />
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Main Feed */}
            <div className="flex-1">
              {/* Feed Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {activeTab === "favorite"
                      ? "Favorite"
                      : selectedTag
                        ? `#${selectedTag}`
                        : "지식 피드"}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeTab === "favorite"
                      ? "즐겨찾기한 게시글만 보여요"
                      : selectedTag
                        ? `${selectedTag} 태그 게시글`
                        : "커뮤니티와 함께 지식을 발견하고 공유하세요"}
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                  <button
                    onClick={() => setSortBy("latest")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      sortBy === "latest"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {"최신순"}
                  </button>
                  <button
                    onClick={() => setSortBy("popular")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      sortBy === "popular"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {"인기순"}
                  </button>
                </div>
              </div>

              {/* Active Tag Filter */}
              {selectedTag && (
                <div className="mb-4 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {"필터:"}
                  </span>
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/25"
                  >
                    #{selectedTag}
                    <span className="ml-1">x</span>
                  </button>
                </div>
              )}

              {/* Posts */}
              {postsLoading ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16">
                  <p className="text-sm text-muted-foreground">글 불러오는 중...</p>
                </div>
              ) : filteredPosts.length > 0 ? (
                <div className="flex flex-col gap-6">
                    {filteredPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onLike={handleLike}
                        onBookmark={handleBookmark}
                        onFavorite={handleFavorite}
                        onSelect={setSelectedPost}
                        onDelete={handleDeletePost}
                        onEdit={handleEditPost}
                        canInteract={true}
                        canEditAndDelete={post.authorId === user?.id || isAdmin}
                      />
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <PenLine className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {activeTab === "favorite"
                      ? "즐겨찾기한 게시글이 없습니다"
                      : posts.length === 0
                        ? "아직 게시글이 없습니다"
                        : "게시글을 찾을 수 없습니다"}
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {activeTab === "favorite"
                      ? "게시글의 하트를 눌러 Favorite에 추가해 보세요!"
                      : posts.length === 0
                        ? "첫 번째 게시글을 작성하고 지식을 공유해 보세요!"
                        : "검색어 또는 필터 조건을 변경해 보세요"}
                  </p>
                  {posts.length === 0 && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      {"새 글 작성하기"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-full shrink-0 lg:w-80">
              <SidebarPanel
                selectedTag={selectedTag}
                onTagSelect={setSelectedTag}
                posts={posts}
                onPostSelect={setSelectedPost}
              />
            </div>
          </div>
        )}
      </main>

      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
      />
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </div>
  )
}
