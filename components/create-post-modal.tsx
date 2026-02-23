"use client"

import { useState } from "react"
import { X, Code, FileText, Tag } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Post } from "@/lib/types"

interface CreatePostModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (post: Post) => void
}

const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "tsx", label: "TSX / React" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
]

export function CreatePostModal({ open, onClose, onSubmit }: CreatePostModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("")
  const [filename, setFilename] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [showCodeEditor, setShowCodeEditor] = useState(false)

  const displayName = user?.email?.split("@")[0] ?? "나"
  const initial = (displayName.charAt(0) ?? "나").toUpperCase()

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim() && tags.length < 5) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return

    const tagsToSubmit = tagInput.trim()
      ? [...tags, tagInput.trim()].filter((t, i, arr) => arr.indexOf(t) === i)
      : [...tags]

    const newPost: Post = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      code: code.trim() || undefined,
      language: language || undefined,
      filename: filename.trim() || undefined,
      tags: tagsToSubmit,
      author: { name: displayName, initial },
      createdAt: "방금 전",
      likes: 0,
      comments: 0,
      liked: false,
      bookmarked: false,
      favorited: false,
    }

    onSubmit(newPost)
    resetForm()
  }

  const resetForm = () => {
    setTitle("")
    setContent("")
    setCode("")
    setLanguage("")
    setFilename("")
    setTagInput("")
    setTags([])
    setShowCodeEditor(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-sm pt-[5vh] pb-[5vh]">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {"새 게시글 작성"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-6">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-title" className="text-sm font-medium text-foreground">
              {"제목"}
            </Label>
            <Input
              id="post-title"
              placeholder="명확하고 설명적인 제목을 입력하세요..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-secondary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-content" className="text-sm font-medium text-foreground">
              {"내용"}
            </Label>
            <Textarea
              id="post-content"
              placeholder="지식, 인사이트, 또는 설명을 공유하세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none bg-secondary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Code Toggle */}
          {!showCodeEditor ? (
            <Button
              variant="outline"
              onClick={() => setShowCodeEditor(true)}
              className="gap-2 self-start border-border text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Code className="h-4 w-4" />
              {"코드 스니펫 추가"}
            </Button>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-code-bg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {"코드 스니펫"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowCodeEditor(false)
                    setCode("")
                    setLanguage("")
                    setFilename("")
                  }}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Remove code snippet"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="bg-secondary text-foreground">
                      <SelectValue placeholder="언어 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="filename.ts"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="flex-1 bg-secondary font-mono text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <Textarea
                placeholder="코드를 여기에 붙여넣으세요..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={8}
                className="resize-none bg-secondary font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                {"태그"}
                <span className="text-xs text-muted-foreground">
                  {"(최대 5개, Enter로 추가)"}
                </span>
              </span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-0.5 rounded-full hover:bg-primary/20"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {tags.length < 5 && (
                <Input
                  placeholder="태그 추가..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="h-8 max-w-[160px] bg-secondary text-sm text-foreground placeholder:text-muted-foreground"
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => {
              resetForm()
              onClose()
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            {"취소"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {"게시글 발행"}
          </Button>
        </div>
      </div>
    </div>
  )
}
