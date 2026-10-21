# cbm260-aibase-ml-web

4호선 CBM 260칸 모니터링 시스템 Web 화면.

화면 데이터는 모두 Mock이며 실제 API는 연결되어 있지 않음.

## 화면

- CBM 대시보드: 플릿 개요, 이상 타임라인, 알람/이벤트, 조치 관리
- CBM 정보: 재학습 설정, 추론, 이상 감지 내역
- CBM 모델: 모델 커스텀, 모델 비교, 임계 튜닝, 모델 진단

## 기술 스택

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4, shadcn/ui, MUI
- Recharts, Motion
- Playwright

## 실행

```bash
npm install
npm run dev
```

## 검사

```bash
npm run lint
npx tsc --noEmit
npx playwright test
```
