// 시스템 이름과 운영 기관 정의
export const systemConfig = {
  name: "4호선 CBM 260칸 모니터링 시스템",
  operatorName: "서울교통공사",
} as const;

// Login 화면 노선 위 열차 번호의 범위와 자릿수 정의, 화면을 열 때마다 이 범위에서 무작위로 정함(이스터에그), 열차 번호는 0001부터 9999까지 앞을 0으로 채우고 몸체 안 편성 번호는 4XX(260칸 = 26편성)
export const loginTrainConfig = {
  trainNumber: { min: 1, max: 9999, digits: 4 },
  formation: { min: 401, max: 426, digits: 3 },
} as const;
