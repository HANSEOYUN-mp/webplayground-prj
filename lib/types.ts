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
  createdAt: string
  likes: number
  comments: number
  liked: boolean
  bookmarked: boolean
  favorited: boolean
}
