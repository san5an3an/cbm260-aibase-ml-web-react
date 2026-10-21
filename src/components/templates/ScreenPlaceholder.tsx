interface ScreenPlaceholderProps {
  title: string;
}

// 아직 이전하지 않은 화면의 임시 표시
export function ScreenPlaceholder({ title }: ScreenPlaceholderProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <h1 className="text-[1.375rem] leading-7 font-bold">{title}</h1>
    </div>
  );
}
