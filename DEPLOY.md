# 무료 배포 가이드 (webplayground-prj)

이 프로젝트는 Next.js 클라이언트 앱이라 **서버 없이** 여러 무료 플랫폼에 배포할 수 있습니다.

---

## 1. Vercel (가장 추천)

Next.js를 만든 회사 서비스라 **설정 없이** 배포하기 좋습니다.

### 방법

1. **GitHub에 코드 올리기**
   - https://github.com 에서 새 저장소 생성
   - 로컬에서:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/내아이디/저장소이름.git
   git push -u origin main
   ```

2. **Vercel 배포**
   - https://vercel.com 접속 → **GitHub로 로그인**
   - **Add New** → **Project** → 방금 만든 GitHub 저장소 선택
   - **Deploy** 클릭 (설정 그대로 두면 됨)
   - 끝나면 `https://프로젝트이름.vercel.app` 주소로 접속 가능

### 무료 한도 (Hobby)

- 배포 개수 제한 없음
- 대역폭/실행 시간 넉넉함 (개인/소규모 프로젝트에 충분)
- 커스텀 도메인 연결 가능

---

## 2. Netlify

### 방법

1. GitHub에 코드 푸시 (위와 동일)
2. https://netlify.com → **Sign up** (GitHub 연동)
3. **Add new site** → **Import an existing project** → GitHub 저장소 선택
4. 빌드 설정:
   - **Build command:** `npm run build` 또는 `pnpm build`
   - **Publish directory:** `.next` 가 아닌 **Next.js 런타임** 사용 시 Netlify가 자동 감지
   - Next.js는 **Netlify 플러그인**으로 배포 가능: [Netlify Next.js 문서](https://docs.netlify.com/integrations/frameworks/next-js/)

### 무료 한도

- 월 100GB 대역폭, 300분 빌드 등 (개인용에 충분)

---

## 3. Cloudflare Pages

### 방법

1. https://pages.cloudflare.com → **GitHub**로 로그인
2. **Create a project** → **Connect to Git** → 저장소 선택
3. **Framework preset:** Next.js 선택
4. **Build command:** `npm run build` 또는 `pnpm build`
5. **Build output directory:** `.next` (또는 Cloudflare 가이드대로)
6. **Save and Deploy**

### 무료 한도

- 대역폭 무제한, 빌드 분 수 제한 있으나 개인 프로젝트에 충분

---

## 4. 빠르게 해보기 (Vercel CLI)

Git 없이 로컬에서 바로 배포할 수도 있습니다.

```bash
# Vercel CLI 설치 (한 번만)
npm i -g vercel

# 프로젝트 폴더에서
cd "c:\Users\gkstj\OneDrive\바탕 화면\Cursor_prj\Webplayground_prj"
vercel
```

- 로그인/회원가입 후 질문에 **Enter**만 눌러도 기본값으로 배포됨
- 나오는 URL(예: `https://webplayground-prj-xxx.vercel.app`)로 접속

---

## 참고

- **데이터 유지:** 현재는 브라우저 메모리만 사용하므로 **새로고침하면 글이 사라집니다.** 나중에 DB(예: Supabase, Firebase)나 API를 붙이면 같은 방식으로 무료 배포 가능합니다.
- **도메인:** Vercel/Netlify/Cloudflare 모두 무료 플랜에서도 본인 도메인 연결 가능합니다.
