import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { FieldError } from "@/components/ui/field";

// 문구의 종류 정의, error는 고쳐야 할 이유, help는 입력을 돕는 안내
export type FieldMessageTone = "error" | "help";

interface FieldMessageProps {
  message: string;
  tone?: FieldMessageTone;
  // Input이 aria-describedby로 가리킬 id
  id?: string;
}

// Input 아래에 굵은 오류 문구(경고 Icon) 또는 회색 안내 문구(정보 Icon) 표시
export function FieldMessage({ message, tone = "error", id }: FieldMessageProps) {
  if (tone === "help") {
    return (
      <p
        id={id}
        data-slot="field-hint"
        className="flex items-center gap-1.5 pt-1.5 text-xs leading-4 font-normal text-muted-foreground"
      >
        <InfoRoundedIcon aria-hidden className="size-3.5 flex-none" />
        {message}
      </p>
    );
  }
  return (
    <FieldError id={id} className="flex items-center gap-1 pt-1.5 text-xs leading-[1.0625rem] font-bold">
      <WarningAmberRoundedIcon aria-hidden className="size-3.5" />
      {message}
    </FieldError>
  );
}
