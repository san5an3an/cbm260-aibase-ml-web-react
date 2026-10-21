import { eyebrowClassName } from "@/components/atoms/eyebrowClassName";
import { cn } from "@/lib/utils";

// 한글이 섞인 Text인지 판정, 한글 Font는 영문 Font보다 기본 Row 높이가 높음
const HANGUL = /[ㄱ-ㆎ가-힣]/;

interface PanelEyebrowProps {
  label: string;
  // 아래 내용과의 간격
  className?: string;
}

// Modal 안 영역의 작은 굵은 머리글 표시, Row 높이는 기본 Row 높이를 측정한 값(영문만 13, 한글이 있으면 16)
export function PanelEyebrow({ label, className }: PanelEyebrowProps) {
  return (
    <div
      data-slot="panel-eyebrow"
      className={cn(
        eyebrowClassName,
        HANGUL.test(label) ? "leading-4" : "leading-[0.8125rem]",
        className,
      )}
    >
      {label}
    </div>
  );
}
