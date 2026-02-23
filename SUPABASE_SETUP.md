# Supabase 설정 - 자세한 단계 (1. 프로젝트 생성 / 2. 환경 변수)

이 프로젝트는 **Supabase**로 회원가입·로그인·로그아웃을 처리합니다.  
아래 순서대로 하면 됩니다.

---

## 1단계: Supabase 프로젝트 생성 (URL·anon key 받기)

### 1-1. Supabase 사이트 접속 및 로그인

1. 브라우저에서 **https://supabase.com** 접속
2. 오른쪽 위 **Sign in** 클릭
3. GitHub 또는 이메일로 **회원가입** 또는 **로그인**

### 1-2. 새 프로젝트 만들기

1. 로그인 후 대시보드가 보이면 **New Project** 버튼 클릭  
   (또는 왼쪽 메뉴 **Project** → **New project**)
2. **Organization**  
   - 이미 있으면 그대로 선택  
   - 없으면 **New organization** 만들어서 이름 입력 후 생성
3. **Project name**  
   - 예: `webplayground` 또는 `my-knowledge-hub`  
   - 영문·숫자만 사용 (한글 X)
4. **Database Password**  
   - DB 접속용 비밀번호. **꼭 적어 두세요.** (나중에 DB 직접 접속할 때 씀)  
   - 12자 이상 권장. 예: `MySecurePass123!`
5. **Region**  
   - 가까운 지역 선택 (예: Northeast Asia (Seoul) 또는 Singapore)
6. **Create new project** 버튼 클릭
7. **1~2분** 기다리기 (프로젝트 생성 중… 표시됨)
8. 생성이 끝나면 대시보드(테이블, SQL 등 메뉴가 보이는 화면)로 들어갑니다.

### 1-3. Project URL과 anon key 복사하기

1. 왼쪽 아래 **톱니바퀴 아이콘** 클릭 → **Project Settings** 선택
2. 왼쪽 메뉴에서 **API** 클릭
3. **Project URL**  
   - `https://xxxxxxxxxxxx.supabase.co` 형태  
   - 오른쪽 **복사 아이콘** 클릭해서 복사 → 메모장 등에 붙여넣기 해 두기
4. **Project API keys** 섹션에서  
   - **anon** / **public** 이라고 적힌 행 찾기  
   - **anon public** 키 값(긴 문자열) 오른쪽 **복사** 클릭 → 역시 메모장에 붙여넣기  
   - 이 키가 **NEXT_PUBLIC_SUPABASE_ANON_KEY** 로 쓸 값입니다.

이제 **1단계 끝**. URL 하나, anon key 하나를 복사해 두었으면 됩니다.

---

## 2단계: 환경 변수 설정 (.env.local)

### 2-1. 프로젝트 폴더 확인

- Cursor(또는 VS Code)에서 **Webplayground_prj** 프로젝트를 연 상태여야 합니다.
- **프로젝트 루트** = `package.json` 이 있는 폴더입니다.

### 2-2. .env.local 파일 만들기

1. Cursor 왼쪽 **파일 탐색기**에서 프로젝트 루트(맨 위 폴더)에서  
   **새 파일** 만들기  
   - Windows: 해당 폴더 우클릭 → New File  
   - 또는 루트 폴더 선택 후 **새 파일 아이콘** 클릭
2. 파일 이름을 **정확히** 입력:  
   **`.env.local`**  
   - 맨 앞의 점(.) 꼭 포함
   - 확장자 없음 (`.env.local.txt` 같은 거 아님)
3. 저장

### 2-3. .env.local 내용 넣기

1. `.env.local` 파일을 연다.
2. 아래 **두 줄**을 그대로 복사해서 붙여넣는다.

```env
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL_붙여넣기
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_public_키_붙여넣기
```

3. **치환하기**  
   - `여기에_Project_URL_붙여넣기` 자리에 **1-3에서 복사한 Project URL** 붙여넣기  
     예: `https://abcdefghijk.supabase.co`  
   - `여기에_anon_public_키_붙여넣기` 자리에 **1-3에서 복사한 anon public 키** 붙여넣기  
     예: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...` (매우 긴 문자열)
4. **등호(=)** 앞뒤에 **공백 없이** 써야 합니다.  
   - 올바른 예: `NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co`  
   - 잘못된 예: `NEXT_PUBLIC_SUPABASE_URL = https://xxxx.supabase.co` (공백 X)
5. **저장** (Ctrl+S)

### 2-4. 최종 .env.local 예시 (실제 값은 본인 것으로)

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAwMDAwMDAsImV4cCI6MjAwNTU3NjAwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- 위 예시의 `https://...` 와 `eyJ...` 부분만 **본인 Supabase에서 복사한 값**으로 바꾸면 됩니다.

### 2-5. 적용하기

- `.env.local`을 수정했으면 **개발 서버를 다시 켜야** 반영됩니다.
- 터미널에서 서버가 돌고 있으면 **Ctrl+C**로 종료한 뒤:
  - `pnpm dev` 또는 `npm run dev` 다시 실행

---

## 3. 이메일 확인 (선택)

- Supabase 기본 설정은 **이메일 인증 후** 로그인 가능할 수 있습니다.
- **테스트만** 할 때는:  
  Supabase 대시보드 → **Authentication** → **Providers** → **Email** → **Confirm email** 를 **끄면**  
  인증 메일 없이 바로 로그인할 수 있습니다.
- 실제 서비스용이면 **Confirm email** 켜 두는 것을 권장합니다.

---

## 4. 동작 확인

- 브라우저에서 `http://localhost:3000` 접속
- **로그인이 필요합니다** 화면이 보이면 정상
- **회원가입** 탭에서 이메일/비밀번호(6자 이상) 입력 후 회원가입
- **로그인** 탭에서 같은 이메일·비밀번호로 로그인
- 로그인되면 피드 화면이 보이고, 헤더 오른쪽 계정 아이콘 → **로그아웃** 가능

---

## 참고

- `.env.local`은 **Git에 올리지 마세요** (비밀 키가 들어 있음). `.gitignore`에 이미 있을 수 있습니다.
- Vercel 등에 **배포**할 때는, 해당 서비스의 **Environment Variables**에  
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 를 **같은 값**으로 한 번 더 설정해야 합니다.
