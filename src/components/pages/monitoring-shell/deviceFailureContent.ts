import type {
  DeviceFailureDialogRow,
  DeviceFailureDialogTexts,
  DeviceFailureRowTone,
} from "@/components/organisms/DeviceFailureDialog";
import type { DeviceFailureAlert } from "@/domain/deviceFailure";
import { formatIsoDateTime } from "@/lib/formatTime";

// 장치 고장 알림 Dialog의 고정 문구, Server가 제목과 안내를 보내게 되면 이 값 대신 알림의 값을 넘김
export const DEVICE_FAILURE_TEXTS: DeviceFailureDialogTexts = {
  eyebrow: "장치 고장 알림 · DEVICE FAILURE",
  title: "장치 고장이 감지되었습니다",
  message: "재학습·추론 작업 중 아래 장치의 고장이 감지되었습니다.\n내용을 확인한 뒤 조치해 주세요.",
  confirmLabel: "확인",
};

// 확인 Request가 실패했을 때 오른쪽 아래 실패 알림의 문구
export const DEVICE_FAILURE_ACKNOWLEDGE_FAILED_TEXT = "고장 알림을 확인 처리하지 못했습니다.";

// Label, 알림에서 읽을 값, 값의 형식 정의, 값이 null이면 해당 Row를 그리지 않음
interface DeviceFailureField {
  label: string;
  tone: DeviceFailureRowTone;
  read: (alert: DeviceFailureAlert) => string | null;
}

// Dialog의 Label과 값 Row 목록, 목록 순서가 화면 순서임. Row를 더하려면 알림 Type의 필드 하나와 이 목록의 항목 하나를 추가
const DEVICE_FAILURE_FIELDS: readonly DeviceFailureField[] = [
  { label: "장치명", tone: "emphasis", read: (alert) => alert.deviceCode },
  { label: "고장일시", tone: "normal", read: (alert) => formatIsoDateTime(alert.failedAt) },
  { label: "고장사유", tone: "danger", read: (alert) => alert.reason },
];

// 알림 한 건을 Dialog의 Row로 변환, 화면 목록의 Row 다음에 Server가 이름까지 보낸 Row를 받은 순서대로 붙임
export function deviceFailureRows(alert: DeviceFailureAlert): readonly DeviceFailureDialogRow[] {
  const listed = DEVICE_FAILURE_FIELDS.flatMap((field) => {
    const value = field.read(alert);
    return value === null ? [] : [{ label: field.label, value, tone: field.tone }];
  });
  const sent = (alert.details ?? []).map((detail) => ({
    label: detail.label,
    value: detail.value,
    tone: "normal" as const,
  }));
  return [...listed, ...sent];
}
