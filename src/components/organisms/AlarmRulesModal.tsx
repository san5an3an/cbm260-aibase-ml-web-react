"use client";

import type { ReactNode } from "react";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import { LegendDot } from "@/components/atoms/LegendDot";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { Well } from "@/components/atoms/Well";
import { CheckboxItem } from "@/components/molecules/CheckboxItem";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { RuleCell } from "@/components/molecules/RuleCell";
import {
  alarmRuleConditionText,
  alarmRuleScopeText,
  alarmRuleSeverityText,
} from "@/components/organisms/alarmRuleTexts";
import {
  alarmRuleScopeCellTones,
  alarmRuleScopeLegendTones,
} from "@/components/organisms/alarmTones";
import { Button } from "@/components/ui/button";
import type { AlarmRule, AlarmRuleMatrix, AlarmRuleMatrixCell } from "@/domain/alarms";
import type { Device } from "@/domain/device";
import { alarmRuleScopeKinds, alarmRuleScopeLabels } from "@/domain/labels/alarmRuleScope";
import { cn } from "@/lib/utils";

// Modal의 Width(rem)
const WIDTH_REM = 62.5;
// 그 범위에 따로 정한 규칙이 있는 이름 뒤에 붙이는 표시
const OWN_RULE_MARK = " ●";
// 꺼진 규칙의 Cell과 범례에 표시할 이름
const OFF_LABEL = "꺼짐";
// 적용되는 규칙이 없는 Cell에 조건 대신 표시할 Text
const NO_RULE_TEXT = "-";
const legendDotClassName = "gap-[0.3125rem] text-[0.6875rem] leading-4 text-muted-foreground";

// 규칙을 수정한 뒤 하단 Row에 표시할 문구
const noticeTexts = {
  saved: "저장되었습니다. 다음 추론부터 적용됩니다.",
  deleted: "삭제되었습니다. 다음 추론부터 더 넓은 규칙을 따릅니다.",
} as const;

export type AlarmRulesNotice = keyof typeof noticeTexts;

// 수정하려는 규칙의 범위, 장치와 Model이 null이면 전체
export type AlarmRuleScope = Pick<AlarmRule, "deviceCode" | "modelCode">;

interface AlarmRulesModalProps {
  open: boolean;
  matrix: AlarmRuleMatrix;
  devices: readonly Device[];
  // 장치에 따로 정한 규칙이 있는 Row만 볼지 여부
  onlyDeviceRules: boolean;
  onOnlyDeviceRulesChange: (onlyDeviceRules: boolean) => void;
  // 규칙을 저장하거나 삭제한 직후의 알림, 없으면 null
  notice: AlarmRulesNotice | null;
  // 규칙을 다시 조회하는 중인지 여부, 그동안 Cell과 이름을 Click할 수 없게 표시
  isReloading: boolean;
  onEditRule: (scope: AlarmRuleScope) => void;
  onClose: () => void;
  // 이 Modal 위에 겹쳐 띄울 규칙 추가, 수정 Modal
  overlays?: ReactNode;
}

interface ScopeButtonProps {
  label: string;
  hasOwnRule: boolean;
  disabled: boolean;
  className: string;
  onClick: () => void;
}

// Model 이름이나 장치 이름을 Click해 그 범위의 규칙을 수정하는 Text Button 표시
function ScopeButton({ label, hasOwnRule, disabled, className, onClick }: ScopeButtonProps) {
  return (
    <Button
      data-slot="alarm-rule-scope-button"
      variant="ghost"
      disabled={disabled}
      focusableWhenDisabled
      onClick={onClick}
      className={cn(
        "h-auto min-w-0 shrink rounded-sm border-0 font-bold timing-micro",
        disabledLookClassName,
        hasOwnRule ? "text-warning-strong hover:text-warning-strong" : "text-foreground",
        className,
      )}
    >
      <span className="truncate">{hasOwnRule ? `${label}${OWN_RULE_MARK}` : label}</span>
    </Button>
  );
}

interface GlobalCellProps {
  // 전체 규칙, 없으면 null
  rule: AlarmRule | null;
  disabled: boolean;
  onClick: () => void;
}

// Table의 왼쪽 위 Cell에 전체 규칙 표시, 전체 규칙이 없으면 조건 없이 이름만 보이고 Click하면 추가
function GlobalCell({ rule, disabled, onClick }: GlobalCellProps) {
  const name = (
    <>
      {alarmRuleScopeLabels.global.label}
      <EditRoundedIcon aria-hidden className="size-3" />
    </>
  );
  if (rule === null) {
    return (
      <RuleCell
        tone="none"
        hoverFill
        primary={NO_RULE_TEXT}
        primaryTone="soft"
        tertiary={name}
        disabled={disabled}
        onClick={onClick}
      />
    );
  }
  return (
    <RuleCell
      tone={alarmRuleScopeCellTones.global}
      hoverFill
      primary={alarmRuleConditionText(rule)}
      primaryTone="soft"
      secondary={alarmRuleSeverityText(rule)}
      tertiary={name}
      disabled={disabled}
      onClick={onClick}
    />
  );
}

interface MatrixCellProps {
  cell: AlarmRuleMatrixCell;
  devices: readonly Device[];
  disabled: boolean;
  onClick: () => void;
}

// 장치와 Model 조합 한 Cell에 적용되는 규칙 표시, 꺼진 규칙은 조건 대신 "꺼짐", 규칙이 없으면 "-" 표시
function MatrixCell({ cell, devices, disabled, onClick }: MatrixCellProps) {
  const { rule, scopeKind } = cell;
  if (rule === null || scopeKind === null) {
    return <RuleCell tone="none" primary={NO_RULE_TEXT} disabled={disabled} onClick={onClick} />;
  }
  const scopeLabel = alarmRuleScopeLabels[scopeKind].label;
  const title = alarmRuleScopeText(rule, devices);
  if (!rule.isEnabled) {
    return (
      <RuleCell
        tone="off"
        primary={OFF_LABEL}
        primaryTone="danger"
        secondary={scopeLabel}
        title={title}
        disabled={disabled}
        onClick={onClick}
      />
    );
  }
  return (
    <RuleCell
      tone={alarmRuleScopeCellTones[scopeKind]}
      highlighted={scopeKind === "pair"}
      primary={alarmRuleConditionText(rule)}
      secondary={alarmRuleSeverityText(rule)}
      tertiary={scopeKind === "pair" ? undefined : scopeLabel}
      title={title}
      disabled={disabled}
      onClick={onClick}
    />
  );
}

// 장치와 Model 조합마다 적용되는 Alarm 규칙을 Table로 보여 주고 Cell을 Click해 수정하는 Modal 표시
export function AlarmRulesModal({
  open,
  matrix,
  devices,
  onlyDeviceRules,
  onOnlyDeviceRulesChange,
  notice,
  isReloading,
  onEditRule,
  onClose,
  overlays,
}: AlarmRulesModalProps) {
  const rows = matrix.rows.filter((row) => !onlyDeviceRules || row.hasDeviceRule);
  const deviceName = (deviceCode: string) =>
    devices.find((device) => device.code === deviceCode)?.name ?? deviceCode;

  return (
    <ModalFrame
      name="alarm-rules"
      open={open}
      onClose={onClose}
      title="알람 규칙"
      widthRem={WIDTH_REM}
      closeOnOutsidePress
      footerStart={
        <span data-slot="alarm-rules-notice" role="status" className="text-xs text-on-success-subtle">
          {notice ? noticeTexts[notice] : ""}
        </span>
      }
      footerEnd={<ActionButton label="닫기" variant="outline" size="mdNarrow" onClick={onClose} />}
      overlays={overlays}
    >
      <ModalBodyScroll bleed={false} data-slot="alarm-rules-body">
        <div
          data-slot="alarm-rules-description"
          className="text-xs leading-[1.125rem] text-pretty text-muted-foreground"
        >
          추론이 끝나면 편성·호차·날짜별로 이상 window 를 모아, 아래 조건 중 하나라도 맞으면 모델별로
          알람을 만듭니다. 같은 편성·호차에 이상 시간대가 겹치는 알람이 이미 있으면 만들지 않습니다. 값이
          0 인 조건은 쓰지 않습니다. 규칙이 겹치면 장치+모델 → 장치 → 모델 → 전체 순으로 더 구체적인
          규칙을 씁니다.
        </div>
        <div data-slot="alarm-rules-legend" className="flex items-center gap-3">
          {alarmRuleScopeKinds.map((scopeKind) => (
            <LegendDot
              key={scopeKind}
              tone={alarmRuleScopeLegendTones[scopeKind]}
              label={alarmRuleScopeLabels[scopeKind].legendLabel}
              className={legendDotClassName}
            />
          ))}
          <LegendDot tone="danger" label={OFF_LABEL} className={legendDotClassName} />
          <span className="flex-1" />
          <CheckboxItem
            label="따로 정한 장치만"
            checked={onlyDeviceRules}
            onCheckedChange={onOnlyDeviceRulesChange}
          />
        </div>
        <div data-slot="alarm-rules-hint" className="text-xs leading-4 text-muted-foreground">
          왼쪽 위 칸을 누르면 전체 규칙, 칸을 누르면 그 장치·모델 규칙, 장치 이름을 누르면 장치 규칙,
          모델 이름을 누르면 모델 규칙을 고칩니다.
        </div>
        <Well
          variant="inset"
          data-slot="alarm-rules-table"
          className="max-h-[52vh] flex-none overflow-auto"
        >
          <div
            data-slot="alarm-rules-grid"
            className="grid auto-rows-[4.125rem] items-stretch gap-2"
            style={{
              gridTemplateColumns: `repeat(${matrix.models.length + 1}, minmax(0, 1fr))`,
            }}
          >
            {/* 첫 Row(전체 규칙, Model 이름)는 같은 Column을 따르는 한 Row로 묶어 Table이 Scroll돼도 위에 고정, 위쪽 Padding(12)은 Card Color 띠로 덮어 지나가는 Cell을 가리고 Click도 되지 않게 함 */}
            <div
              data-slot="alarm-rules-head"
              className="sticky top-0 z-10 col-span-full grid grid-cols-subgrid grid-rows-[4.125rem] items-stretch bg-card before:absolute before:inset-x-0 before:-top-3 before:h-3 before:bg-card before:content-['']"
            >
              <GlobalCell
                rule={matrix.globalRule}
                disabled={isReloading}
                onClick={() => onEditRule({ deviceCode: null, modelCode: null })}
              />
              {matrix.models.map((model) => (
                <ScopeButton
                  key={model.modelCode}
                  label={model.modelCode}
                  hasOwnRule={model.hasModelRule}
                  disabled={isReloading}
                  className="h-8 self-end px-0 text-xs"
                  onClick={() => onEditRule({ deviceCode: null, modelCode: model.modelCode })}
                />
              ))}
            </div>
            {rows.map((row) => [
              <ScopeButton
                key={row.deviceCode}
                label={deviceName(row.deviceCode)}
                hasOwnRule={row.hasDeviceRule}
                disabled={isReloading}
                className="h-[4.125rem] justify-start px-1 text-sm"
                onClick={() => onEditRule({ deviceCode: row.deviceCode, modelCode: null })}
              />,
              ...row.cells.map((cell) => (
                <MatrixCell
                  key={`${row.deviceCode}-${cell.modelCode}`}
                  cell={cell}
                  devices={devices}
                  disabled={isReloading}
                  onClick={() =>
                    onEditRule({ deviceCode: row.deviceCode, modelCode: cell.modelCode })
                  }
                />
              )),
            ])}
          </div>
          {rows.length === 0 ? (
            <div data-slot="alarm-rules-empty" className="p-6 text-center text-sm text-muted-foreground">
              장치를 지정한 규칙이 없습니다.
            </div>
          ) : null}
        </Well>
      </ModalBodyScroll>
    </ModalFrame>
  );
}
