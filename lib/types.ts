export interface Post {
  id: string
  title: string
  content: string
  code?: string
  language?: string
  filename?: string
  tags: string[]
  author: {
    name: string
    initial: string
  }
  /** 글 작성자 user id (수정/삭제 권한 확인용) */
  authorId?: string
  createdAt: string
  likes: number
  comments: number
  liked: boolean
  bookmarked: boolean
  favorited: boolean
}
