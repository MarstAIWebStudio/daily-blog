# Railway 배포 가이드

## 1. Railway 계정 생성
- https://railway.app 접속
- GitHub로 로그인

## 2. 프로젝트 생성
1. Railway 대시보드에서 "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. `daily-blog` 저장소 선택

## 3. 환경 변수 설정
Railway 프로젝트 설정에서 다음 환경 변수 추가:

```
SUPABASE_URL=https://mzlhzvalhzrztnmvywuj.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bGh6dmFsaHpyenRubXZ5d3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzcwNTgsImV4cCI6MjA5NDc1MzA1OH0.dFydAdJ5eBmXpvCRaDpy44-iO2_YWBCq2d1wwv0cSik
PORT=3000
NODE_ENV=production
```

## 4. 배포
- 환경 변수 설정 후 자동으로 배포 시작
- 배포 완료 후 생성된 URL 복사

## 5. HTML 파일 수정
배포 후 받은 URL로 `blog.html` 파일 수정:

```javascript
const API_BASE = 'https://your-railway-url.railway.app/api';
```

## 6. 배포된 HTML 호스팅
- `blog.html`을 GitHub Pages 또는 Vercel에 호스팅
- 또는 Railway에 정적 파일 서빙 추가

---

## 주의사항
- Supabase 테이블이 먼저 생성되어야 함
- CORS 설정 확인 (server.js에 이미 설정됨)
