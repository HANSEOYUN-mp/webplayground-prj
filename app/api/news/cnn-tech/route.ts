import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TECH_KEYWORDS = [
  'tech', 'ai', 'openai', 'apple', 'google', 'meta', 'microsoft', 'semiconductor', 'chip', 
  'supercomputer', 'siri', 'silicon', 'software', 'app', 'cyber', 'hacker', 'instagram', 
  'tiktok', 'social media', 'nvidia', 'broadcom', 'robot', 'device', 'smartphone', 
  'iphone', 'macbook', 'ipad', 'computer', 'algorithm', 'netflix', 'spotify', 'amazon', 
  'tesla', 'intel', 'musk', 'chatgpt', 'anthropic', 'samsung', 'phone', 'telecom', 'gaming', 
  'crypto', 'bitcoin', 'cybersecurity'
];

function isTechRefined(title: string, url: string): boolean {
  const lowercaseTitle = title.toLowerCase();
  const lowercaseUrl = url.toLowerCase();
  
  if (lowercaseUrl.includes('/tech/')) {
    return true;
  }
  
  return TECH_KEYWORDS.some(keyword => {
    // For very short keywords, use word boundaries to avoid false positives (e.g. "ai" matching "Britain")
    if (keyword === 'ai' || keyword === 'app' || keyword === 'chip' || keyword === 'musk' || keyword === 'siri') {
      const regex = new RegExp('\\b' + keyword + '\\b', 'i');
      return regex.test(title) || regex.test(url);
    }
    return lowercaseTitle.includes(keyword) || lowercaseUrl.includes(keyword);
  });
}

async function fetchPageArticles(url: string): Promise<Array<{ title: string, link: string }>> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store'
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch CNN page: ${res.status}`);
    }
    
    const html = await res.text();
    
    // Using negative lookahead to prevent crossing </a> tags
    const regex = /<a\s+[^>]*href="([^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*?<span\s+[^>]*class="[^"]*headline-text[^"]*"[^>]*>([\s\S]*?)<\/span>/g;
    const matches: Array<{ title: string, link: string }> = [];
    const seenLinks = new Set();
    let match;
    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      const link = href.startsWith('/') ? "https://www.cnn.com" + href : href;
      const title = match[2].trim()
        .replace(/<[^>]*>?/gm, '') // strip HTML if any
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
        
      if (!seenLinks.has(link)) {
        seenLinks.add(link);
        matches.push({ title, link });
      }
    }
    return matches;
  } catch (error) {
    console.error(`CNN Scrape error for ${url}:`, error);
    return [];
  }
}

export async function GET() {
  try {
    const [techArticles, businessArticles] = await Promise.all([
      fetchPageArticles("https://www.cnn.com/business/tech"),
      fetchPageArticles("https://www.cnn.com/business")
    ]);
    
    // Merge and deduplicate
    const allArticles = [...techArticles, ...businessArticles];
    const uniqueArticles: Array<{ title: string, link: string }> = [];
    const seenLinks = new Set();
    
    allArticles.forEach(art => {
      if (!seenLinks.has(art.link)) {
        seenLinks.add(art.link);
        uniqueArticles.push(art);
      }
    });
    
    // Filter for Tech
    const techFiltered = uniqueArticles.filter(art => isTechRefined(art.title, art.link));
    
    return NextResponse.json({ items: techFiltered.slice(0, 30) }); // Return up to 30 items
  } catch (error) {
    console.error("CNN Scrape Tech error:", error);
    return NextResponse.json({ error: "Failed to load CNN Tech News" }, { status: 500 });
  }
}

