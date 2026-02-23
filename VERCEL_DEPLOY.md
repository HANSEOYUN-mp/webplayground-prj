# Vercel로 배포하기 - 차근차근 단계별 가이드

이 프로젝트를 **무료**로 인터넷에 공개하려면,  
**1) GitHub에 코드 올리기** → **2) Vercel에서 배포하기** 순서로 하면 됩니다.

---

## 준비물

- GitHub 계정 (없으면 아래 1단계에서 가입)
- 이 프로젝트 폴더(Webplayground_prj)가 내 컴퓨터에 있음
- Supabase를 쓰고 있다면, **Project URL**과 **anon key**를 메모해 둔 상태 (나중에 Vercel에 입력함)

---

# 1단계: GitHub에 코드 올리기

Vercel은 **GitHub 저장소**를 보고 배포하므로, 먼저 GitHub에 프로젝트를 올립니다.

---

## 1-1. GitHub 가입 / 로그인

1. 브라우저에서 **https://github.com** 접속
2. 오른쪽 위 **Sign up** (가입) 또는 **Sign in** (로그인)
3. 이메일로 가입하거나, **Continue with Google** 등으로 간편 가입

---

## 1-2. 새 저장소(Repository) 만들기

1. 로그인 후 오른쪽 위 **+** 버튼 클릭 → **New repository** 선택
2. **Repository name** 에 저장소 이름 입력  
   - 예: `webplayground-prj` (영문, 하이픈 가능)
3. **Public** 선택
4. **"Add a README file"** 등은 **체크하지 말고** 비워 둠
5. 맨 아래 **Create repository** 클릭
6. 생성되면 **빈 저장소** 화면이 나옴  
   - 주소가 `https://github.com/내아이디/저장소이름` 형태로 보임  
   - 이 주소를 **복사**해 두기 (나중에 사용)

---

## 1-3. 내 컴퓨터의 프로젝트를 GitHub에 올리기

**방법 A: 터미널 사용 (Cursor / VS Code)**

1. Cursor에서 **터미널** 열기 (Ctrl + `)
2. 프로젝트 폴더로 이동:
   ```bash
   cd "c:\Users\gkstj\OneDrive\바탕 화면\Cursor_prj\Webplayground_prj"
   ```
3. 아래 명령어를 **순서대로** 입력 (한 줄씩 Enter):

   ```bash
   git init
   git add .
   git commit -m "첫 커밋"
   git branch -M main
   git remote add origin https://github.com/내아이디/저장소이름.git
   git push -u origin main
   ```

   - **반드시** `내아이디`와 `저장소이름`을 1-2에서 만든 걸로 바꾸기  
     예: `https://github.com/honggil-dong/webplayground-prj.git`
4. 처음이면 GitHub **로그인** 또는 **토큰** 입력 요청이 나올 수 있음 → 안내대로 진행

**방법 B: 소스트리(SourceTree) 사용**

1. 소스트리 실행 → **새로 만들기** 또는 **Clone / New** 에서 **로컬 저장소 만들기**
2. **대상 경로**에 프로젝트 폴더 선택:  
   `c:\Users\gkstj\OneDrive\바탕 화면\Cursor_prj\Webplayground_prj`
3. **만들기** 클릭 (아직 Git이 없으면 "Git 저장소 초기화" 후 진행)
4. **원격(Remote)** 추가:  
   - 원격 이름: `origin`  
   - URL: `https://github.com/내아이디/저장소이름.git`
5. **모든 파일** 스테이징 → **커밋** (메시지 예: "첫 커밋") → **푸시**  
   - 브랜치가 없으면 `main`으로 푸시

여기까지 끝나면 **GitHub 저장소에 코드가 올라간 상태**입니다.

---

# 2단계: Vercel로 배포하기

---

## 2-1. Vercel 가입 / 로그인

1. 브라우저에서 **https://vercel.com** 접속
2. **Sign Up** 또는 **Log in** 클릭
3. **Continue with GitHub** 선택 → GitHub 로그인/권한 허용  
   - 이렇게 하면 Vercel이 GitHub 저장소 목록을 볼 수 있음

---

## 2-2. 새 프로젝트 만들기 (GitHub 저장소 연결)

1. Vercel 대시보드에서 **Add New...** → **Project** 클릭
2. **Import Git Repository** 목록에 GitHub 저장소가 보임  
   - 방금 올린 **webplayground-prj** (또는 본인이 만든 이름) 선택
3. **Import** 클릭

---

## 2-3. 프로젝트 설정 (대부분 그대로 두기)

1. **Project Name**: 그대로 두거나 원하는 이름으로 변경
2. **Framework Preset**: **Next.js** 로 자동 잡혀 있으면 OK
3. **Root Directory**: 비워 둠
4. **Build and Output Settings**:  
   - Build Command: `pnpm run build` 또는 `npm run build` (프로젝트에서 쓰는 걸로)  
   - 보통 자동으로 잡혀 있음

---

## 2-4. 환경 변수 넣기 (Supabase 쓸 때 필수)

로그인/회원가입이 동작하려면, 로컬의 `.env.local`에 넣었던 값을 Vercel에도 넣어야 합니다.

1. **Environment Variables** 섹션 펼치기
2. **Name** 에 `NEXT_PUBLIC_SUPABASE_URL` 입력  
   **Value** 에 Supabase **Project URL** 붙여넣기 (예: `https://xxxx.supabase.co`)
3. **Add** 또는 **Add Another** 로 하나 더 추가  
   **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   **Value**: Supabase **anon public** 키 붙여넣기
4. **Environment** 는 **Production**, **Preview**, **Development** 전부 체크해 두면 편함

Supabase를 안 쓰면 이 단계는 건너뛰어도 됩니다.

---

## 2-5. 배포 시작

1. **Deploy** 버튼 클릭
2. 1~2분 정도 기다리면 **Building...** → **Ready** 로 바뀜
3. **Visit** 버튼 클릭하거나, 나오는 주소(예: `https://webplayground-prj.vercel.app`)로 접속

---

# 3단계: 배포 후 확인

- 배포된 주소로 들어가서 **로그인 / 회원가입**이 되는지 확인
- 문제 있으면 Vercel 대시보드 → 해당 프로젝트 → **Settings** → **Environment Variables** 에서 값이 맞는지 다시 확인
- 코드를 수정한 뒤에는 **GitHub에 푸시**하면 Vercel이 자동으로 다시 배포함 (소스트리에서 푸시해도 동일)

---

# 요약 체크리스트

- [ ] GitHub 가입 후 새 저장소 생성
- [ ] 프로젝트 폴더를 Git으로 푸시 (터미널 또는 소스트리)
- [ ] Vercel 가입 (GitHub로 로그인)
- [ ] Vercel에서 **Add New** → **Project** → GitHub 저장소 Import
- [ ] **Environment Variables** 에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 입력
- [ ] **Deploy** 클릭 후 나온 주소로 접속해서 확인

끝까지 하시면 **무료로** 전 세계에서 접속 가능한 웹사이트가 됩니다.
