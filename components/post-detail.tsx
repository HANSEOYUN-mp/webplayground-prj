"use client"

import { ArrowLeft, Heart, MessageCircle, Bookmark, Share2, Send, Pencil, Trash2, X, Check } from "lucide-react"
import { useState } from "react"
import { CodeBlock } from "@/components/code-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Post } from "@/lib/types"

interface Comment {
  id: string
  author: { name: string; initial: string }
  content: string
  createdAt: string
}

interface PostDetailProps {
  post: Post
  onBack: () => void
  onLike: (id: string) => void
  onBookmark: (id: string) => void
  onFavorite: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (post: Post) => void
  /** false면 좋아요·북마크·즐겨찾기·댓글 입력 비활성 */
  canInteract?: boolean
  /** false면 수정·삭제 버튼 숨김 */
  canEditAndDelete?: boolean
}

export function PostDetail({ post, onBack, onLike, onBookmark, onFavorite, onDelete, onEdit, canInteract = true, canEditAndDelete = true }: PostDetailProps) {
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editContent, setEditContent] = useState(post.content)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleAddComment = () => {
    if (!commentText.trim()) return

    const newComment: Comment = {
      id: Date.now().toString(),
      author: { name: "나", initial: "나" },
      content: commentText.trim(),
      createdAt: "방금 전",
    }

    setComments([...comments, newComment])
    setCommentText("")
  }

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editContent.trim()) return
    onEdit({ ...post, title: editTitle.trim(), content: editContent.trim() })
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(post.title)
    setEditContent(post.content)
    setIsEditing(false)
  }

  const handleDelete = () => {
    onDelete(post.id)
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {"피드로 돌아가기"}
        </button>
        <div className="flex items-center gap-1">
          {canEditAndDelete && !isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="수정"
              >
                <Pencil className="h-3.5 w-3.5" />
                {"수정"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                aria-label="삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {"삭제"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete confirm dialog */}
      {showDeleteConfirm && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
            <Trash2 className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{"이 게시글을 삭제하시겠습니까?"}</p>
            <p className="text-xs text-muted-foreground">{"삭제한 게시글은 복구할 수 없습니다."}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {"취소"}
            </button>
            <button
              onClick={handleDelete}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-destructive/80"
            >
              {"삭제"}
            </button>
          </div>
        </div>
      )}

      {/* Post */}
      <article className="rounded-xl border border-border bg-card p-6 lg:p-8">
        {/* Author */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {post.author.initial}
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">
              {post.author.name}
            </span>
            <div className="text-xs text-muted-foreground">{post.createdAt}</div>
          </div>
        </div>

        {/* Editing mode */}
        {isEditing ? (
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">{"제목"}</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-secondary text-lg font-semibold text-foreground"
                placeholder="제목"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">{"내용"}</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                className="resize-none bg-secondary text-sm leading-relaxed text-foreground"
                placeholder="내용"
              />
            </div>
            <div className="flex gap-2 self-end">
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                {"취소"}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editTitle.trim() || !editContent.trim()}
                className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {"저장"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Title */}
            <h1 className="mb-4 text-2xl font-bold leading-tight text-foreground lg:text-3xl text-balance">
              {post.title}
            </h1>

            {/* Tags */}
            <div className="mb-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Content */}
            <div className="mb-6 text-sm leading-relaxed text-muted-foreground lg:text-base">
              {post.content}
            </div>
          </>
        )}

        {/* Code */}
        {post.code && post.language && (
          <div className="mb-6">
            <CodeBlock
              code={post.code}
              language={post.language}
              filename={post.filename}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 border-t border-border pt-4">
          {canInteract ? (
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                post.liked
                  ? "text-red-400 hover:bg-red-400/10"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} />
              <span>{post.likes}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>{post.likes}</span>
            </span>
          )}

          <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>{comments.length}</span>
          </span>

          {canInteract ? (
            <>
              <button
                onClick={() => onBookmark(post.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  post.bookmarked
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Bookmark className={`h-4 w-4 ${post.bookmarked ? "fill-current" : ""}`} />
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
                <Heart className={`h-4 w-4 ${post.favorited ? "fill-current" : ""}`} />
                {"Favorite"}
              </button>
            </>
          ) : null}

          <button className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Share2 className="h-4 w-4" />
            {"공유"}
          </button>
        </div>
      </article>

      {/* Comments Section */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          {"댓글"} ({comments.length})
        </h3>

        {/* Comment List */}
        {comments.length > 0 ? (
          <div className="mb-4 flex flex-col gap-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-3 rounded-lg bg-secondary/50 p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {comment.author.initial}
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {comment.author.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {comment.createdAt}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">{"아직 댓글이 없습니다. 첫 댓글을 남겨보세요!"}</p>
        )}

        {/* Add Comment: 로그인 시에만 표시 */}
        {canInteract ? (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {"나"}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Textarea
                placeholder="댓글을 입력하세요..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="resize-none bg-secondary text-sm text-foreground placeholder:text-muted-foreground"
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className="gap-1.5 self-end bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {"작성"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{"로그인하면 댓글을 남길 수 있어요."}</p>
        )}
      </div>
    </div>
  )
}
