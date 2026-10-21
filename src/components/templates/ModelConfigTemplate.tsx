import type { ReactNode } from "react";

interface ModelConfigTemplateProps {
  filterBar: ReactNode;
  listCard: ReactNode;
}

// 모델 커스텀 화면 Layout 구성, Filter Row, 남는 Height의 설정 목록
export function ModelConfigTemplate({ filterBar, listCard }: ModelConfigTemplateProps) {
  return (
    <div data-slot="model-config" className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5">
      {filterBar}
      {listCard}
    </div>
  );
}
