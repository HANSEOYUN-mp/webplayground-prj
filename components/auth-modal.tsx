"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AuthModalProps {
  open: boolean
  onClose: () => void
  defaultTab?: "login" | "signup"
}

export function AuthModal({ open, onClose, defaultTab = "login" }: AuthModalProps) {
  const { signIn, signUp, error, clearError } = useAuth()
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      clearError()
      setLocalError(null)
      setLoginEmail("")
      setLoginPassword("")
      setSignupEmail("")
      setSignupPassword("")
      setSignupPasswordConfirm("")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (!loginEmail.trim() || !loginPassword) {
      setLocalError("이메일과 비밀번호를 입력하세요.")
      return
    }
    setLoading(true)
    const { error: err } = await signIn(loginEmail.trim(), loginPassword)
    setLoading(false)
    if (!err) {
      onClose()
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (!signupEmail.trim() || !signupPassword || !signupPasswordConfirm) {
      setLocalError("모든 항목을 입력하세요.")
      return
    }
    if (signupPassword.length < 6) {
      setLocalError("비밀번호는 6자 이상이어야 합니다.")
      return
    }
    if (signupPassword !== signupPasswordConfirm) {
      setLocalError("비밀번호가 일치하지 않습니다.")
      return
    }
    setLoading(true)
    const { error: err } = await signUp(signupEmail.trim(), signupPassword)
    setLoading(false)
    if (!err) {
      onClose()
    }
  }

  const displayError = localError || error

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>로그인 / 회원가입</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="signup">회원가입</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">이메일</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-secondary"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">비밀번호</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-secondary"
                  autoComplete="current-password"
                />
              </div>
              {displayError && (
                <p className="text-sm text-destructive">{displayError}</p>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "처리 중..." : "로그인"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup" className="mt-4">
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">이메일</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="bg-secondary"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">비밀번호 (6자 이상)</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="bg-secondary"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password-confirm">비밀번호 확인</Label>
                <Input
                  id="signup-password-confirm"
                  type="password"
                  value={signupPasswordConfirm}
                  onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                  className="bg-secondary"
                  autoComplete="new-password"
                />
              </div>
              {displayError && (
                <p className="text-sm text-destructive">{displayError}</p>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "처리 중..." : "회원가입"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
