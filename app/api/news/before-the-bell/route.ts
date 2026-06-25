import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface BriefItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // CDATA 내용 추출
    .replace(/<[^>]*>?/gm, '') // HTML 태그 제거
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// 상대적인 시간 포맷팅 (예: "3시간 전")
function formatTimeAgo(pubDateStr: string): string {
  try {
    const pubDate = new Date(pubDateStr);
    const now = new Date();
    const diffMs = now.getTime() - pubDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    
    return pubDate.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    return pubDateStr;
  }
}

export async function GET() {
  const feedUrl = 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=SPY';
  
  try {
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store'
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch Yahoo Finance Feed: ${res.status}`);
    }
    
    const xml = await res.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    const items: BriefItem[] = [];
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];
      
      const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent);
      const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);
      const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent);
      const descriptionMatch = /<description>([\s\S]*?)<\/description>/.exec(itemContent);
      
      if (titleMatch && linkMatch) {
        const rawTitle = titleMatch[1];
        const rawLink = linkMatch[1];
        const rawDescription = descriptionMatch ? descriptionMatch[1] : '';
        const rawPubDate = pubDateMatch ? pubDateMatch[1] : '';
        
        // 데이터 정제
        const title = cleanText(rawTitle);
        const description = cleanText(rawDescription);
        const link = rawLink.trim();
        const pubDate = formatTimeAgo(rawPubDate);
        
        // 광고성 글이나 쓸데없는 글 필터링 (선택 사항, 여기서는 제외)
        items.push({ title, link, description, pubDate });
      }
    }
    
    // 최대 10개 반환 (기본 5개 노출용으로 넉넉하게 리턴)
    return NextResponse.json({ items: items.slice(0, 10) });
  } catch (error) {
    console.error("Before the Bell API error:", error);
    return NextResponse.json({ error: "Failed to load Before the Bell summaries" }, { status: 500 });
  }
}
