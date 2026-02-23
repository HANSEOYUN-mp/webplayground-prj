"use client"

import { useMemo } from "react"
import { Tag, Hash, Zap, FileText } from "lucide-react"
import type { Post } from "@/lib/types"

interface SidebarPanelProps {
  selectedTag: string | null
  onTagSelect: (tag: string | null) => void
  posts: Post[]
  onPostSelect: (post: Post) => void
}

export function SidebarPanel({ selectedTag, onTagSelect, posts, onPostSelect }: SidebarPanelProps) {
  const tagCounts = useMemo(() => {
    const countByTag: Record<string, number> = {}
    const list = Array.isArray(posts) ? posts : []
    list.forEach((post) => {
      const tagList = Array.isArray(post.tags) ? post.tags : []
      tagList.forEach((tag) => {
        const key = String(tag).trim()
        if (key) {
          countByTag[key] = (countByTag[key] ?? 0) + 1
        }
      })
    })
    return Object.entries(countByTag)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [posts])

  const stats = useMemo(() => ({
    posts: posts.length,
    members: new Set(posts.map((p) => p.author.name)).size,
    codeSnippets: posts.filter((p) => p.code).length,
    favorited: posts.filter((p) => p.favorited).length,
  }), [posts])

  return (
    <aside className="flex flex-col gap-6">
      {/* All Posts List */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{"전체 게시글"}</h3>
          <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {posts.length}
          </span>
        </div>
        <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {posts.length > 0 ? (
            posts.map((post) => (
              <button
                key={post.id}
                onClick={() => onPostSelect(post)}
                className="flex items-start gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-secondary"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-semibold text-primary">
                  {post.author.initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {post.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{post.createdAt}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {"게시글이 없습니다."}
            </p>
          )}
        </div>
      </div>

      {/* Tags (from posts, counted by usage) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 text-foreground">
          <Tag className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{"태그"}</h3>
        </div>
        <div className="flex flex-col gap-1">
          {tagCounts.length > 0 ? (
            tagCounts.map((tag) => (
              <button
                key={tag.name}
                onClick={() =>
                  onTagSelect(selectedTag === tag.name ? null : tag.name)
                }
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  selectedTag === tag.name
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5" />
                  {tag.name}
                </span>
                <span className="text-xs">{tag.count}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {"태그가 없습니다."}
            </p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 text-foreground">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{"플랫폼 통계"}</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary p-3 text-center">
            <div className="text-lg font-bold text-foreground">{stats.posts}</div>
            <div className="text-xs text-muted-foreground">{"게시글"}</div>
          </div>
          <div className="rounded-lg bg-secondary p-3 text-center">
            <div className="text-lg font-bold text-foreground">{stats.members}</div>
            <div className="text-xs text-muted-foreground">{"멤버"}</div>
          </div>
          <div className="rounded-lg bg-secondary p-3 text-center">
            <div className="text-lg font-bold text-foreground">{stats.codeSnippets}</div>
            <div className="text-xs text-muted-foreground">{"코드 조각"}</div>
          </div>
          <div className="rounded-lg bg-secondary p-3 text-center">
            <div className="text-lg font-bold text-foreground">{stats.favorited}</div>
            <div className="text-xs text-muted-foreground">{"즐겨찾기"}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
