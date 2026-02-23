"use client"

import { useState, useMemo } from "react"
import { Header, type NavTab } from "@/components/header"
import { PostCard } from "@/components/post-card"
import { SidebarPanel } from "@/components/sidebar-panel"
import { CreatePostModal } from "@/components/create-post-modal"
import { PostDetail } from "@/components/post-detail"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/contexts/auth-context"
import type { Post } from "@/lib/types"
import { Filter, PenLine, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login")

  const [posts, setPosts] = useState<Post[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest")
  const [activeTab, setActiveTab] = useState<NavTab>("feed")

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

  const handleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    )
  }

  const handleBookmark = (id: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, bookmarked: !post.bookmarked } : post
      )
    )
  }

  const handleFavorite = (id: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, favorited: !post.favorited } : post
      )
    )
  }

  const handleCreatePost = (newPost: Post) => {
    setPosts([newPost, ...posts])
    setShowCreateModal(false)
  }

  const handleDeletePost = (id: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== id))
    if (selectedPost?.id === id) {
      setSelectedPost(null)
    }
  }

  const handleEditPost = (updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === updatedPost.id ? updatedPost : post))
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          onNewPost={() => {}}
          searchQuery=""
          onSearchChange={() => {}}
          activeTab="feed"
          onTabChange={() => {}}
          onOpenAuthModal={openAuthModal}
        />
        <main className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 lg:px-8">
          <div className="flex max-w-md flex-col items-center rounded-xl border border-border bg-card p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              로그인이 필요합니다
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              게시글을 보거나 작성하려면 로그인하거나 회원가입해 주세요.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => openAuthModal("login")}
                className="gap-1.5"
              >
                <LogIn className="h-4 w-4" />
                로그인
              </Button>
              <Button
                onClick={() => openAuthModal("signup")}
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                회원가입
              </Button>
            </div>
          </div>
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
      />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {currentSelectedPost ? (
          <PostDetail
            post={currentSelectedPost}
            onBack={() => setSelectedPost(null)}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onFavorite={handleFavorite}
            onDelete={handleDeletePost}
            onEdit={handleEditPost}
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
              {filteredPosts.length > 0 ? (
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
