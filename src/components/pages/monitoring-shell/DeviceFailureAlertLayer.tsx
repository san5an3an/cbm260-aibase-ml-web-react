"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import { DeviceFailureDialog } from "@/components/organisms/DeviceFailureDialog";
import {
  DEVICE_FAILURE_ACKNOWLEDGE_FAILED_TEXT,
  DEVICE_FAILURE_TEXTS,
  deviceFailureRows,
} from "@/components/pages/monitoring-shell/deviceFailureContent";
import { useDeviceFailureAlerts } from "@/components/pages/monitoring-shell/useDeviceFailureAlerts";
import type { DeviceFailureAlert } from "@/domain/deviceFailure";

interface DeviceFailureAlertLayerProps {
  // Dialog가 열리고 닫힐 때 알림, 공통 Layout이 그동안 Session Dialog를 바꾸지 않게 함
  onOpenChange: (open: boolean) => void;
}

// 받은 장치 고장 알림을 어느 화면에서든 한 건씩 맨 앞에 띄우고 확인을 전송하는 연결 지점, 확인이 실패하면 Dialog 위에 실패 알림 표시
export function DeviceFailureAlertLayer({ onOpenChange }: DeviceFailureAlertLayerProps) {
  const { current, acknowledgingId, acknowledge } = useDeviceFailureAlerts(() =>
    showToast(DEVICE_FAILURE_ACKNOWLEDGE_FAILED_TEXT, "error"),
  );
  // 마지막 알림을 확인한 뒤 Dialog가 사라지는 동안에도 그 알림의 내용 표시
  const [lastShown, setLastShown] = useState<DeviceFailureAlert | null>(null);
  if (current !== null && current !== lastShown) setLastShown(current);
  const shown = current ?? lastShown;
  const isOpen = current !== null;

  useEffect(() => {
    onOpenChange(isOpen);
  }, [isOpen, onOpenChange]);

  return (
    <DeviceFailureDialog
      open={isOpen}
      texts={DEVICE_FAILURE_TEXTS}
      rows={shown === null ? [] : deviceFailureRows(shown)}
      isAcknowledging={acknowledgingId !== null}
      onAcknowledge={() => {
        if (current !== null) acknowledge(current.id);
      }}
    />
  );
}
