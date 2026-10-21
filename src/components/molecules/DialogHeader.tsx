"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogHeader as DialogHeaderRoot,
  DialogTitle,
} from "@/components/ui/dialog";

interface DialogHeaderProps {
  title: string;
}

// Modal의 제목과 닫기 Button을 한 Row로 표시
export function DialogHeader({ title }: DialogHeaderProps) {
  return (
    <DialogHeaderRoot className="min-h-9 flex-none flex-row items-center gap-3">
      <DialogTitle className="text-[1.375rem] leading-7 font-bold">{title}</DialogTitle>
      <span className="flex-1" />
      <DialogClose
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="닫기"
            className="size-8 rounded-sm border-0 text-foreground timing-micro dark:hover:bg-muted"
          />
        }
      >
        <CloseRoundedIcon aria-hidden className="size-5" />
      </DialogClose>
    </DialogHeaderRoot>
  );
}
