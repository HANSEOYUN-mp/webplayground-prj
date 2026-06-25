import { NextResponse } from 'next/server';

export const revalidate = 600; // 10 minutes cache

export async function GET() {
  try {
    const res = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      next: { revalidate: 600 }
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch CNN data: ${res.status}`);
    }
    
    const data = await res.json();
    const fg = data.fear_and_greed;
    
    const currentScore = Math.round(fg.score);
    const currentRating = fg.rating; // e.g. "extreme greed"
    
    // Historical data
    const history = {
      previousClose: { score: Math.round(fg.previous_close || currentScore) },
      oneWeekAgo: { score: Math.round(fg.previous_1_week || currentScore) },
      oneMonthAgo: { score: Math.round(fg.previous_1_month || currentScore) },
      oneYearAgo: { score: Math.round(fg.previous_1_year || currentScore) }
    };

    // 7 Indicators
    const indicators = [
      { 
        name: "Market Momentum", 
        summary: "S&P 500 지수 125일 이동평균선 대비 상승 폭", 
        rating: data.market_momentum_sp500?.rating || "neutral", 
        key: "market_momentum", 
        score: Math.round(data.market_momentum_sp500?.score || 0),
        data: data.market_momentum_sp500?.data || [],
        data125: data.market_momentum_sp125?.data || []
      },
      { 
        name: "Stock Price Strength", 
        summary: "뉴욕증시 52주 신고가 vs 신저가 종목 비율", 
        rating: data.stock_price_strength?.rating || "neutral", 
        key: "stock_price_strength", 
        score: Math.round(data.stock_price_strength?.score || 0),
        data: data.stock_price_strength?.data || []
      },
      { 
        name: "Stock Price Breadth", 
        summary: "상승 종목과 하락 종목 간의 총 거래량 차이", 
        rating: data.stock_price_breadth?.rating || "neutral", 
        key: "stock_price_breadth", 
        score: Math.round(data.stock_price_breadth?.score || 0),
        data: data.stock_price_breadth?.data || []
      },
      { 
        name: "Put and Call Options", 
        summary: "하락(Put) 옵션 대비 상승장(Call) 베팅 비율", 
        rating: data.put_call_options?.rating || "neutral", 
        key: "put_call_options", 
        score: Math.round(data.put_call_options?.score || 0),
        data: data.put_call_options?.data || []
      },
      { 
        name: "Market Volatility", 
        summary: "공포지수라 불리는 시장 내재 변동성치 (VIX 지수)", 
        rating: data.market_volatility_vix?.rating || "neutral", 
        key: "market_volatility", 
        score: Math.round(data.market_volatility_vix?.score || 0),
        data: data.market_volatility_vix?.data || [],
        data50: data.market_volatility_vix_50?.data || []
      },
      { 
        name: "Junk Bond Demand", 
        summary: "우량 채권 위험도 대비 투자부적격(정크본드) 수요층", 
        rating: data.junk_bond_demand?.rating || "neutral", 
        key: "junk_bond_demand", 
        score: Math.round(data.junk_bond_demand?.score || 0),
        data: data.junk_bond_demand?.data || []
      },
      { 
        name: "Safe Haven Demand", 
        summary: "안전자산(국채) 편입 대비 위험자산(주식) 선호도 우위", 
        rating: data.safe_haven_demand?.rating || "neutral", 
        key: "safe_haven_demand", 
        score: Math.round(data.safe_haven_demand?.score || 0),
        data: data.safe_haven_demand?.data || []
      }
    ];

    return NextResponse.json({
      score: currentScore,
      rating: currentRating,
      history,
      indicators,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("CNN API error:", error);
    return NextResponse.json({ error: "Failed to load Fear & Greed data" }, { status: 500 });
  }
}
