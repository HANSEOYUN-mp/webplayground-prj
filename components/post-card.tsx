"use client"

import { useState } from "react"
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Pencil, Trash2, X, Check } from "lucide-react"
import { CodeBlock } from "@/components/code-block"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Post } from "@/lib/types"

interface PostCardProps {
  post: Post
  onLike: (id: string) => void
  onBookmark: (id: string) => void
  onFavorite: (id: string) => void
  onSelect: (post: Post) => void
  onDelete: (id: string) => void
  onEdit: (post: Post) => void
  /** false면 좋아요·북마크·즐겨찾기 버튼 비활성(읽기 전용) */
  canInteract?: boolean
  /** false면 수정·삭제 메뉴 숨김 */
  canEditAndDelete?: boolean
}

export function PostCard({ post, onLike, onBookmark, onFavorite, onSelect, onDelete, onEdit, canInteract = true, canEditAndDelete = true }: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editContent, setEditContent] = useState(post.content)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editContent.trim()) return
    onEdit({ ...post, title: editTitle.trim(), content: editContent.trim() })
    setIsEditing(false)
    setShowMenu(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(post.title)
    setEditContent(post.content)
    setIsEditing(false)
  }

  const handleDelete = () => {
    onDelete(post.id)
    setShowDeleteConfirm(false)
    setShowMenu(false)
  }

  return (
    <article className="group relative rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      {/* Delete Confirm Overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-sm font-medium text-foreground">{"이 게시글을 삭제하시겠습니까?"}</p>
            <p className="text-xs text-muted-foreground">{"삭제한 게시글은 복구할 수 없습니다."}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {"취소"}
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-destructive px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-destructive/80"
              >
                {"삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 lg:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {post.author.initial}
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-foreground">
              {post.author.name}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              {post.createdAt}
            </span>
          </div>
          {/* More menu: 로그인 + 본인 글일 때만 */}
          {canEditAndDelete && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-border bg-card p-1 shadow-xl">
                    <button
                      onClick={() => {
                        setIsEditing(true)
                        setShowMenu(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {"수정"}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(true)
                        setShowMenu(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {"삭제"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Title / Content - Edit or View mode */}
        {isEditing ? (
          <div className="mb-4 flex flex-col gap-3">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="bg-secondary text-foreground"
              placeholder="제목"
            />
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="resize-none bg-secondary text-sm text-foreground"
              placeholder="내용"
            />
            <div className="flex gap-2 self-end">
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                {"취소"}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editTitle.trim() || !editContent.trim()}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {"저장"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Title */}
            <button
              onClick={() => onSelect(post)}
              className="mb-2 text-left"
            >
              <h2 className="text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary lg:text-xl">
                {post.title}
              </h2>
            </button>

            {/* Content */}
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-3">
              {post.content}
            </p>
          </>
        )}

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Code Block */}
        {post.code && post.language && (
          <div className="mb-4">
            <CodeBlock
              code={post.code}
              language={post.language}
              filename={post.filename}
            />
          </div>
        )}

        {/* Actions: canInteract 없으면 숫자만 표시, 버튼 비활성 */}
        <div className="flex items-center gap-1 border-t border-border pt-4">
          {canInteract ? (
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                post.liked
                  ? "text-red-400 hover:bg-red-400/10"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
              aria-label={post.liked ? "좋아요 취소" : "좋아요"}
            >
              <Heart
                className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`}
              />
              <span>{post.likes}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>{post.likes}</span>
            </span>
          )}

          <button
            onClick={() => onSelect(post)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="댓글 보기"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post.comments}</span>
          </button>

          {canInteract ? (
            <>
              <button
                onClick={() => onBookmark(post.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  post.bookmarked
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                aria-label={post.bookmarked ? "북마크 해제" : "북마크"}
              >
                <Bookmark
                  className={`h-4 w-4 ${post.bookmarked ? "fill-current" : ""}`}
                />
              </button>

              <button
                onClick={() => onFavorite(post.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  post.favorited
                    ? "text-rose-500 hover:bg-rose-500/10"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                aria-label={post.favorited ? "Favorite 해제" : "Favorite"}
              >
                <Heart
                  className={`h-4 w-4 ${post.favorited ? "fill-current" : ""}`}
                />
              </button>
            </>
          ) : null}

          <button
            className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="공유"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  )
}
