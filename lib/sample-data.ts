import type { Post } from "./types"

export const samplePosts: Post[] = [
  {
    id: "1",
    title: "React Server Components Deep Dive",
    content:
      "Server Components let you render components on the server, reducing the JavaScript sent to the client. Here's a practical example of how to fetch data directly inside a component without useEffect or client-side state management.",
    code: `// app/posts/page.tsx
async function PostsPage() {
  const posts = await fetch("https://api.example.com/posts", {
    cache: "no-store",
  })
  const data = await posts.json()

  return (
    <main>
      <h1>Latest Posts</h1>
      {data.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </main>
  )
}

export default PostsPage`,
    language: "tsx",
    filename: "posts/page.tsx",
    tags: ["React", "Next.js", "Server Components"],
    author: { name: "Minjun", initial: "M" },
    createdAt: "2시간 전",
    likes: 42,
    comments: 8,
    liked: false,
    bookmarked: false,
    favorited: false,
  },
  {
    id: "2",
    title: "Python Async/Await Pattern for API Calls",
    content:
      "When building Python backends, async patterns can dramatically improve throughput for I/O-bound operations. This pattern uses aiohttp to make concurrent API requests efficiently.",
    code: `import asyncio
import aiohttp

async def fetch_data(session, url):
    async with session.get(url) as response:
        return await response.json()

async def main():
    urls = [
        "https://api.example.com/users",
        "https://api.example.com/posts",
        "https://api.example.com/comments",
    ]

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_data(session, url) for url in urls]
        results = await asyncio.gather(*tasks)

    for result in results:
        print(f"Fetched {len(result)} items")

asyncio.run(main())`,
    language: "python",
    filename: "api_fetcher.py",
    tags: ["Python", "Async", "API"],
    author: { name: "Soyeon", initial: "S" },
    createdAt: "5시간 전",
    likes: 31,
    comments: 5,
    liked: true,
    bookmarked: false,
    favorited: false,
  },
  {
    id: "3",
    title: "CSS Grid vs Flexbox: When to Use Which",
    content:
      "A common question in frontend development. Use Flexbox for one-dimensional layouts (rows OR columns) and Grid for two-dimensional layouts (rows AND columns simultaneously). Here is a practical comparison that shows Grid's power for complex card layouts.",
    code: `/* Grid: Best for 2D layouts */
.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  grid-template-rows: auto;
  gap: 1.5rem;
  padding: 2rem;
}

.card-featured {
  grid-column: span 2;
  grid-row: span 2;
}

/* Flexbox: Best for 1D alignment */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
}`,
    language: "css",
    filename: "layout.css",
    tags: ["CSS", "Layout", "Frontend"],
    author: { name: "Jihoon", initial: "J" },
    createdAt: "1일 전",
    likes: 67,
    comments: 12,
    liked: false,
    bookmarked: true,
    favorited: false,
  },
  {
    id: "4",
    title: "Understanding Go Goroutines and Channels",
    content:
      "Go's concurrency model is built around goroutines and channels. This example demonstrates how to use a worker pool pattern for processing tasks concurrently with controlled parallelism.",
    code: `package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    for j := range jobs {
        fmt.Printf("Worker %d processing job %d\\n", id, j)
        time.Sleep(time.Second)
        results <- j * 2
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)

    var wg sync.WaitGroup

    // Start 3 workers
    for w := 1; w <= 3; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }

    // Send 9 jobs
    for j := 1; j <= 9; j++ {
        jobs <- j
    }
    close(jobs)

    wg.Wait()
    close(results)
}`,
    language: "go",
    filename: "worker_pool.go",
    tags: ["Go", "Concurrency", "Goroutines"],
    author: { name: "Taehyung", initial: "T" },
    createdAt: "2일 전",
    likes: 54,
    comments: 7,
    liked: false,
    bookmarked: false,
    favorited: false,
  },
  {
    id: "5",
    title: "TypeScript Utility Types You Should Know",
    content:
      "TypeScript's built-in utility types are incredibly powerful for creating derived types. Here are the most commonly used ones that will save you from writing repetitive type definitions.",
    code: `// Partial - makes all properties optional
interface User {
  id: number
  name: string
  email: string
  role: "admin" | "user"
}

type UpdateUser = Partial<User>

// Pick - select specific properties
type UserPreview = Pick<User, "id" | "name">

// Omit - exclude specific properties
type CreateUser = Omit<User, "id">

// Record - create an object type
type UserRoles = Record<string, User[]>

// ReturnType - extract return type
function getUser() {
  return { id: 1, name: "Kim", email: "kim@dev.io" }
}
type UserReturn = ReturnType<typeof getUser>

// Conditional type example
type IsString<T> = T extends string ? "yes" : "no"
type Result = IsString<"hello"> // "yes"`,
    language: "typescript",
    filename: "utility-types.ts",
    tags: ["TypeScript", "Types", "Fundamentals"],
    author: { name: "Yuna", initial: "Y" },
    createdAt: "3일 전",
    likes: 89,
    comments: 15,
    liked: true,
    bookmarked: true,
    favorited: true,
  },
]
