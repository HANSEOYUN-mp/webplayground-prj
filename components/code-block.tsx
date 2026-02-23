"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

interface CodeBlockProps {
  code: string
  language: string
  filename?: string
}

function tokenize(code: string, language: string) {
  const lines = code.split("\n")

  return lines.map((line) => {
    const tokens: { text: string; type: string }[] = []
    let remaining = line

    const patterns: { regex: RegExp; type: string }[] = getPatterns(language)

    while (remaining.length > 0) {
      let matched = false

      for (const { regex, type } of patterns) {
        const match = remaining.match(regex)
        if (match && match.index === 0) {
          tokens.push({ text: match[0], type })
          remaining = remaining.slice(match[0].length)
          matched = true
          break
        }
      }

      if (!matched) {
        tokens.push({ text: remaining[0], type: "plain" })
        remaining = remaining.slice(1)
      }
    }

    return tokens
  })
}

function getPatterns(language: string) {
  const common = [
    { regex: /^\/\/.*/, type: "comment" },
    { regex: /^\/\*[\s\S]*?\*\//, type: "comment" },
    { regex: /^#.*/, type: "comment" },
    { regex: /^"(?:[^"\\]|\\.)*"/, type: "string" },
    { regex: /^'(?:[^'\\]|\\.)*'/, type: "string" },
    { regex: /^`(?:[^`\\]|\\.)*`/, type: "string" },
    { regex: /^\d+\.?\d*/, type: "number" },
  ]

  const jsKeywords =
    /^(?:const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|interface|type|extends|implements|enum|readonly|public|private|protected|static|abstract|declare|module|namespace|require|yield|of|in|as|is)\b/
  const pyKeywords =
    /^(?:def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|raise|with|yield|lambda|pass|break|continue|and|or|not|is|in|True|False|None|self|async|await|print)\b/
  const goKeywords =
    /^(?:func|package|import|var|const|type|struct|interface|return|if|else|for|range|switch|case|default|go|chan|select|defer|map|make|len|append|nil|true|false|error|string|int|float64|bool)\b/

  switch (language) {
    case "python":
    case "py":
      return [
        ...common,
        { regex: pyKeywords, type: "keyword" },
        { regex: /^[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
        { regex: /^@\w+/, type: "keyword" },
      ]
    case "go":
    case "golang":
      return [
        ...common,
        { regex: goKeywords, type: "keyword" },
        { regex: /^[a-zA-Z_]\w*(?=\s*\()/, type: "function" },
      ]
    default:
      return [
        ...common,
        { regex: jsKeywords, type: "keyword" },
        { regex: /^[a-zA-Z_$]\w*(?=\s*\()/, type: "function" },
        { regex: /^<\/?[a-zA-Z][\w.-]*/, type: "keyword" },
        { regex: /^\/>/, type: "keyword" },
      ]
  }
}

const tokenColors: Record<string, string> = {
  keyword: "text-code-keyword",
  string: "text-code-string",
  comment: "text-code-comment",
  function: "text-code-function",
  number: "text-code-number",
  plain: "text-foreground",
}

export function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const tokenizedLines = tokenize(code.trim(), language)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-code-bg">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-destructive/50" />
            <div className="h-3 w-3 rounded-full bg-code-string/50" />
            <div className="h-3 w-3 rounded-full bg-code-keyword/50" />
          </div>
          {filename && (
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {filename}
            </span>
          )}
          <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <pre className="font-mono text-sm leading-relaxed">
          {tokenizedLines.map((tokens, lineIndex) => (
            <div key={lineIndex} className="flex">
              <span className="mr-4 inline-block w-6 select-none text-right text-code-comment/50">
                {lineIndex + 1}
              </span>
              <span>
                {tokens.map((token, tokenIndex) => (
                  <span
                    key={tokenIndex}
                    className={tokenColors[token.type] || "text-foreground"}
                  >
                    {token.text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
}
