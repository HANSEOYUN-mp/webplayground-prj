# ☁️ 수집 봇 구글 클라우드 배포 가이드

내 컴퓨터가 꺼져도 봇이 24시간 돌아가도록 구글 클라우드 평생 무료 서버(`e2-micro`)에 배포하는 가장 빠른 방법입니다. 봇 폴더 안의 파일이 딱 3개뿐이므로, 복잡한 설정 없이 서버에서 직접 파일을 만드는 것이 가장 쉽습니다.

---

## 1. 무료 서버(VM) 만들기
1. [구글 클라우드 콘솔(Google Cloud Console)](https://console.cloud.google.com/)에 접속하여 가입 및 프로젝트를 생성합니다. (신규 가입 시 결제 카드를 등록하지만, 평생 무료 등급을 쓰면 과금되지 않습니다.)
2. 좌측 메뉴에서 **Compute Engine -> VM 인스턴스**로 이동하여 **[인스턴스 만들기]**를 클릭합니다.
3. 설정 사항:
   - **지역**: `us-west1`, `us-central1`, `us-east1` 중 하나 선택 (평생 무료 지원 리전)
   - **머신 유형**: `e2-micro` 선택 (아주 중요! 이것만 무료입니다)
   - **부팅 디스크**: 운영체제를 `Ubuntu` (버전 22.04 LTS 추천)로 변경합니다.
4. 맨 아래 **[만들기]** 버튼을 눌러 서버를 생성합니다.

## 2. 서버에 접속하여 Node.js 설치
1. 생성된 인스턴스 목록 우측에 있는 **[SSH]** 버튼을 클릭하면 검은색 리눅스 터미널 창이 새로 열립니다.
2. 아래 명령어들을 터미널에 한 줄씩 복사/붙여넣기(`Ctrl+V` 또는 우클릭) 한 후 엔터를 쳐주세요.
```bash
# 시스템 업데이트 및 Node.js 설치
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 3. 봇 파일 생성하기
단 3개의 파일(package.json, whaleWatcher.js, .env)만 있으면 됩니다. 폴더를 하나 만들고 세팅합니다.
```bash
# bot 폴더 만들고 이동
mkdir whale-bot
cd whale-bot
```

### 1) package.json 만들기
```bash
nano package.json
```
빈 화면이 나오면 내 컴퓨터의 `bot/package.json` 안의 내용을 전체 복사해서 우클릭으로 붙여넣은 뒤, **`Ctrl+X` -> `Y` -> `Enter`** 를 순서대로 눌러서 저장하고 빠져나옵니다.

### 2) whaleWatcher.js 만들기
```bash
nano whaleWatcher.js
```
마찬가지로 내 컴퓨터의 `bot/whaleWatcher.js` 파일 내용(단, 테스트로 변경한 1천만을 다시 **1억(100_000_000)**으로 돌린 원본)을 붙여넣고 **`Ctrl+X` -> `Y` -> `Enter`** 로 저장합니다.

### 3) .env 만들기
```bash
nano .env
```
내 컴퓨터에 설정해둔 `bot/.env`의 내용(프라이빗 키 포함)을 똑같이 붙여넣고 **`Ctrl+X` -> `Y` -> `Enter`** 로 저장합니다.

## 4. 라이브러리 설치 및 24시간 가동
서버 셋팅은 모두 끝났습니다! 이제 필요한 패키지를 설치하고, 봇이 꺼지지 않도록 `pm2`라는 매니저를 써서 실행합니다.

```bash
# 1. 터미널 경로가 여전히 whale-bot 폴더인지 확인 후 설치
npm install

# 2. 24시간 무중단 가동을 돕는 pm2 매니저 설치
sudo npm install -g pm2

# 3. 봇 실전 가동!
pm2 start whaleWatcher.js --name "whale-bot"

# 4. (선택사항) 서버가 재부팅되어도 봇이 알아서 켜지게 설정
pm2 save
pm2 startup
```

---
🎉 **끝입니다!** 이제 터미널 창을 꺼버려도, 컴퓨터 전원을 뽑아도 구글 클라우드에서 봇이 24시간 작동하며 Supabase DB에 1억 이상 거래를 꽂아 넣어줄 것입니다. 내일 아침 9시에 대시보드에 접속해보시면 어젯밤 고래들의 치열한 전투 흔적이 쌓여있을 겁니다!
