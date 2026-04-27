"use client"

import { useState } from "react"
import { Search, Plus, Menu, X, LogOut, LogIn, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type NavTab = "stock" | "crypto" | "prediction" | "news" | "post"

interface HeaderProps {
  onNewPost: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
  onOpenAuthModal?: (tab?: "login" | "signup") => void
  /** false면 비로그인: 검색만 표시, 새 글 작성·Favorite 탭 숨김 */
  isLoggedIn?: boolean
}

export function Header({ onNewPost, searchQuery, onSearchChange, activeTab, onTabChange, onOpenAuthModal, isLoggedIn = true }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, loading: authLoading, signOut } = useAuth()

  const openLogin = () => {
    onOpenAuthModal?.("login")
  }
  const openSignup = () => {
    onOpenAuthModal?.("signup")
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span 
              className="text-3xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-primary to-white drop-shadow-md"
              style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive" }}
            >
              OmniArchive
            </span>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { id: "stock", label: "Stock" },
            { id: "crypto", label: "Crypto" },
            { id: "prediction", label: "Prediction" },
            { id: "news", label: "News & Trends" },
            { id: "post", label: "Post" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as NavTab)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary ${
                activeTab === tab.id ? "text-foreground bg-secondary/50" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {(user || !isLoggedIn) && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="게시글 검색..."
                className="h-9 w-64 bg-secondary pl-9 text-sm text-foreground placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
          {user ? (
            <>
              <Button
                onClick={onNewPost}
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {'새 글 작성'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary hover:bg-primary/30"
                    aria-label="계정 메뉴"
                  >
                    {(user.email ?? "U").charAt(0).toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
                    {user.email}
                  </div>
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : !authLoading ? (
            <>
              <Button
                onClick={openLogin}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <LogIn className="h-4 w-4" />
                로그인
              </Button>
              <Button
                onClick={openSignup}
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus className="h-4 w-4" />
                회원가입
              </Button>
            </>
          ) : null}
        </div>

        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5 text-foreground" />
          ) : (
            <Menu className="h-5 w-5 text-foreground" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 py-2">
            {[
              { id: "stock", label: "Stock" },
              { id: "crypto", label: "Crypto" },
              { id: "prediction", label: "Prediction" },
              { id: "news", label: "News & Trends" },
              { id: "post", label: "Post" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { onTabChange(tab.id as NavTab); setMobileMenuOpen(false); }}
                className={`rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary ${
                  activeTab === tab.id ? "font-medium text-foreground bg-secondary/50" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex flex-col gap-2 pt-2">
            {(user || !isLoggedIn) && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="게시글 검색..."
                  className="h-9 bg-secondary pl-9 text-sm text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            )}
            {user ? (
              <>
                <Button
                  onClick={() => {
                    onNewPost()
                    setMobileMenuOpen(false)
                  }}
                  size="sm"
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  {'새 글 작성'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    signOut()
                    setMobileMenuOpen(false)
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </Button>
              </>
            ) : !authLoading ? (
              <>
                <Button onClick={() => { openLogin(); setMobileMenuOpen(false); }} size="sm" variant="outline" className="gap-1.5">
                  <LogIn className="h-4 w-4" />
                  로그인
                </Button>
                <Button onClick={() => { openSignup(); setMobileMenuOpen(false); }} size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <UserPlus className="h-4 w-4" />
                  회원가입
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}

    </header>
  )
}
