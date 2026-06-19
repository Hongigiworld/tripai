# tripAI — AI 여행 플래너

숙소 위치 기반 동선 최적화 + 다국가 여행 AI 일정 생성기

## 기능
- 다국가 루트 설계 (도시 순서 변경, 추가, 삭제)
- 날짜별 숙소 위치 입력 → 반경 기반 동선 최적화
- 일정 시작 시간 설정 (종일 / 오후 / 저녁)
- 이동수단 설정 (도보 / 대중교통 / 택시 / 렌트카 / 기차)
- 동행 인원 / 예산 반영
- Klook / Grab / 구글맵 링크 자동 삽입

## 로컬 실행

```bash
npm install
cp .env.example .env.local
# .env.local에 API 키 입력
npm run dev
```

## Vercel 배포

1. GitHub에 push
2. vercel.com → Import Repository
3. Environment Variables에 `ANTHROPIC_API_KEY` 추가
4. Deploy

## 환경변수

| 변수 | 설명 |
|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 키 (console.anthropic.com) |
