// reduced motion을 켜면 팝업이 어느 방향으로 뜨든 이동과 크기 변화 없이 Fade만 남기는 class 정의
export const popupReducedMotionClassName =
  "motion-reduce:data-closed:zoom-out-100 motion-reduce:data-open:zoom-in-100 motion-reduce:data-[side=bottom]:slide-in-from-top-0 motion-reduce:data-[side=top]:slide-in-from-bottom-0 motion-reduce:data-[side=left]:slide-in-from-right-0 motion-reduce:data-[side=right]:slide-in-from-left-0 motion-reduce:data-[side=inline-start]:slide-in-from-right-0 motion-reduce:data-[side=inline-end]:slide-in-from-left-0";
