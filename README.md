# 📝 일상 공유 블로그

Node.js + Express + Supabase로 만든 간단한 블로그 플랫폼

## 🚀 빠른 시작

### 1. Supabase 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성 (이미 완료됨)
2. SQL 에디터에서 `supabase-setup.sql` 파일의 내용 실행
3. 테이블이 생성되었는지 확인

### 2. 환경 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 수정 (이미 설정됨)
# SUPABASE_URL=https://mzlhzvalhzrztnmvywuj.supabase.co
# SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. 의존성 설치

```bash
npm install
```

### 4. 서버 실행

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 프로덕션 모드
npm start
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 5. HTML 파일 실행

`blog.html` 파일을 브라우저에서 열면 됩니다.

## 📁 파일 구조

```
daily-blog/
├── server.js              # Express 서버 메인 파일
├── package.json           # 의존성 설정
├── .env.example           # 환경 변수 예제
├── .env                   # 환경 변수 (실제 설정)
├── supabase-setup.sql     # Supabase 테이블 생성 SQL
├── blog.html              # 프론트엔드 HTML
├── Procfile               # Railway 배포 설정
├── railway.json           # Railway 빌드 설정
├── RAILWAY_DEPLOY.md      # Railway 배포 가이드
└── README.md              # 이 파일
```

## 🔌 API 엔드포인트

### 사용자 인증
- `POST /api/auth/login` - 이메일 로그인/회원가입
- `GET /api/auth/me/:email` - 사용자 정보 조회

### 방(Room)
- `GET /api/rooms` - 모든 방 목록
- `POST /api/rooms` - 새 방 생성
- `GET /api/rooms/:id` - 방 상세 정보
- `POST /api/rooms/:id/join` - 방 가입
- `POST /api/rooms/:id/leave` - 방 나가기

### 게시글
- `GET /api/rooms/:roomId/posts` - 방의 게시글 목록
- `POST /api/posts` - 새 게시글 작성
- `DELETE /api/posts/:id` - 게시글 삭제

### 댓글
- `POST /api/posts/:id/comments` - 댓글 추가
- `DELETE /api/comments/:id` - 댓글 삭제

### 헬스 체크
- `GET /api/health` - 서버 상태 확인

## 📝 요청/응답 예제

### 로그인
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### 방 생성
```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "우리 반 블로그",
    "description": "함께 일상을 공유해요",
    "creator_email": "user@example.com"
  }'
```

### 게시글 작성
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": 1,
    "title": "오늘의 이야기",
    "content": "좋은 날씨네요!",
    "author_email": "user@example.com"
  }'
```

### 댓글 추가
```bash
curl -X POST http://localhost:3000/api/posts/1/comments \
  -H "Content-Type: application/json" \
  -d '{
    "author_email": "user@example.com",
    "text": "좋은 글이네요!"
  }'
```

## 🛠️ 개발

### 자동 재시작 (개발 모드)
```bash
npm run dev
```

### 의존성 추가
```bash
npm install <package-name>
```

## 📦 배포

### Railway 배포 (추천)

자세한 가이드는 [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) 참고

1. [Railway](https://railway.app)에서 계정 생성
2. GitHub 연결
3. "New Project" → "Deploy from GitHub repo" 선택
4. `daily-blog` 저장소 선택
5. 환경 변수 설정:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `PORT=3000`
   - `NODE_ENV=production`
6. 배포 완료 후 URL 복사
7. `blog.html`의 `API_BASE` 수정

### Heroku 배포
```bash
# Heroku CLI 설치 후
heroku login
heroku create your-app-name
git push heroku main
```

### Render 배포
1. [Render](https://render.com)에서 계정 생성
2. GitHub 연결
3. New Web Service 생성
4. 환경 변수 설정

## ⚠️ 주의사항

- `.env` 파일은 절대 GitHub에 올리지 마세요
- Supabase 키를 공개하지 마세요
- 프로덕션 환경에서는 RLS를 활성화하세요

## 🐛 문제 해결

### CORS 에러
- `blog.html`의 `API_BASE` 주소가 맞는지 확인
- 서버가 실행 중인지 확인

### 데이터베이스 연결 실패
- Supabase URL과 Key가 맞는지 확인
- `.env` 파일이 제대로 로드되는지 확인

### 포트 이미 사용 중
```bash
# 다른 포트로 실행
PORT=3001 npm start
```

## 📄 라이선스

MIT

## 👨‍💻 작성자

MarstAIWebStudio

---

**행복한 블로깅되세요! 🎉**
