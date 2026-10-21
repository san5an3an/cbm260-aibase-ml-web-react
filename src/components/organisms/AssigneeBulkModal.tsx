"use client";

import { useId, type ReactNode } from "react";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { TextAreaInput } from "@/components/atoms/TextAreaInput";
import { Well } from "@/components/atoms/Well";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { FormRow } from "@/components/molecules/FormRow";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { SelectField } from "@/components/molecules/SelectField";

// Modal의 Width(rem)
const WIDTH_REM = 47.5;
// 선택한 건수를 한글 수로 적는 범위, 그보다 많으면 숫자로 표시
const KOREAN_COUNTS = ["", "한", "두", "세", "네", "다섯"];

// 담당자를 지정할 대상 하나의 정의
export interface AssigneeBulkItem {
  id: string;
  // 제목 앞에 표시할 Badge(심각도 등)
  badge?: ReactNode;
  title: string;
  meta: string;
}

interface AssigneeBulkModalProps {
  open: boolean;
  // 대상 List 위에 표시할 작은 제목
  listTitle: string;
  // 담당자를 지정할 대상 List, 제목과 안내 문구의 건수도 이 List의 개수로 표시
  items: readonly AssigneeBulkItem[];
  // 선택할 수 있는 담당자 목록
  assignees: readonly string[];
  // 선택한 담당자, 선택 전이면 null
  assignee: string | null;
  onAssigneeChange: (assignee: string) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  // 담당자를 선택하지 않고 지정 Button을 눌렀을 때 오류 문구 표시 여부
  showAssigneeError: boolean;
  // 대상 아래에 표시할 안내문
  notice?: string;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

// 선택한 여러 건에 같은 담당자와 Comment를 지정하는 Modal 표시
export function AssigneeBulkModal({
  open,
  listTitle,
  items,
  assignees,
  assignee,
  onAssigneeChange,
  comment,
  onCommentChange,
  showAssigneeError,
  notice,
  isSubmitting,
  onSubmit,
  onClose,
}: AssigneeBulkModalProps) {
  const fieldId = useId();
  const itemCount = items.length;
  const countText = KOREAN_COUNTS[itemCount] || String(itemCount);

  return (
    <ModalFrame
      name="assignee-bulk"
      open={open}
      onClose={onClose}
      title={`담당자 지정 · 선택 ${itemCount}건`}
      widthRem={WIDTH_REM}
      footerEnd={
        <>
          <ActionButton label="취소" variant="outline" weight="semibold" onClick={onClose} />
          <ActionButton
            label="지정"
            weight="semibold"
            disabled={isSubmitting}
            onClick={onSubmit}
          />
        </>
      }
    >
      <ModalBodyScroll>
        <Well data-slot="assignee-bulk-targets" className="flex flex-col gap-1">
          <span
            data-slot="assignee-bulk-list-title"
            className="pb-1 text-xs leading-[1.0625rem] font-bold text-brand-line4-text"
          >
            {listTitle}
          </span>
          {items.map((item) => (
            <div
              key={item.id}
              data-slot="assignee-bulk-item"
              className="flex h-[3.25rem] items-center gap-3 border-b border-dashed border-border"
            >
              {item.badge}
              <span
                data-slot="assignee-bulk-item-title"
                className="w-35 flex-none truncate text-sm font-bold"
              >
                {item.title}
              </span>
              <span
                data-slot="assignee-bulk-item-meta"
                className="text-sm text-muted-foreground tabular-nums"
              >
                {item.meta}
              </span>
            </div>
          ))}
        </Well>
        <Well data-slot="assignee-bulk-form" className="flex flex-col gap-3">
          <FormRow
            label="담당자"
            htmlFor={`${fieldId}-assignee`}
            required
            error={showAssigneeError ? "담당자를 선택하세요" : null}
          >
            <SelectField
              id={`${fieldId}-assignee`}
              label="담당자"
              value={assignee}
              options={assignees.map((name) => ({ value: name, label: `정비사 선택 (${name})` }))}
              onValueChange={onAssigneeChange}
              placeholder="정비사 선택"
              className="w-full"
            />
          </FormRow>
          <FormRow label="코멘트" htmlFor={`${fieldId}-comment`}>
            <TextAreaInput
              id={`${fieldId}-comment`}
              value={comment}
              onValueChange={onCommentChange}
              placeholder={`선택 입력 · ${countText} 건에 같은 코멘트가 남습니다`}
              rows={3}
            />
          </FormRow>
        </Well>
        {notice ? (
          <AlertBanner
            tone="brand"
            icon={<InfoRoundedIcon aria-hidden className="size-5" />}
            iconTone="primary"
            emphasis="plain"
          >
            {notice}
          </AlertBanner>
        ) : null}
      </ModalBodyScroll>
    </ModalFrame>
  );
}
