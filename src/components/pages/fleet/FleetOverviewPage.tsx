"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RefreshControl } from "@/components/molecules/RefreshControl";
import { AnomalyHistoryCard } from "@/components/organisms/AnomalyHistoryCard";
import { FleetKpiColumn } from "@/components/organisms/FleetKpiColumn";
import { FleetSkeleton } from "@/components/organisms/FleetSkeleton";
import { ModelCoverageCard } from "@/components/organisms/ModelCoverageCard";
import { RiskRankingCard, type RiskRankingRowKey } from "@/components/organisms/RiskRankingCard";
import { PageBarActions } from "@/components/pages/monitoring-shell/PageBarActions";
import { FleetOverviewTemplate } from "@/components/templates/FleetOverviewTemplate";
import { screenPath } from "@/config/navigation";
import { formatIsoTime } from "@/lib/formatTime";
import { useAsyncResource } from "@/lib/useAsyncResource";
import { useWaitFeedback } from "@/lib/useWaitFeedback";
import {
  fetchAnomalyHistory,
  fetchAnomalyHistoryFilterOptions,
  fetchFleetOverview,
} from "@/services/fleet";

const ANOMALY_SCREEN_PATH = screenPath("anomaly");
// 조회가 끝나기 전에 갱신 시각 위치에 표시할 문구
const EMPTY_TIME = "--:--:--";

// 화면에서 취소할 수 있도록 AbortSignal을 넘기는 조회
const loadOverview = (signal: AbortSignal) => fetchFleetOverview({ signal });
const loadHistoryFilterOptions = (signal: AbortSignal) =>
  fetchAnomalyHistoryFilterOptions({ signal });

// 플릿 개요 화면에 데이터와 사용자 동작 연결
export function FleetOverviewPage() {
  const router = useRouter();
  // 선택하기 전에는 조회한 List의 첫 항목 사용
  const [pickedDeviceCode, setPickedDeviceCode] = useState<string | null>(null);
  const [pickedDays, setPickedDays] = useState<number | null>(null);
  const [pickedRankingRow, setPickedRankingRow] = useState<RiskRankingRowKey | null>(null);

  const overview = useAsyncResource(loadOverview);
  const filterOptions = useAsyncResource(loadHistoryFilterOptions);

  const overviewData = overview.resource.status === "success" ? overview.resource.data : null;
  const optionsData =
    filterOptions.resource.status === "success" ? filterOptions.resource.data : null;
  // 선택한 값이 현재 List에 없으면 첫 항목으로 되돌림
  const deviceCode =
    optionsData?.devices.find((device) => device.code === pickedDeviceCode)?.code ??
    optionsData?.devices[0]?.code ??
    null;
  const days =
    optionsData?.dayCounts.find((dayCount) => dayCount === pickedDays) ??
    optionsData?.dayCounts[0] ??
    null;
  // 선택할 수 있는 장치나 기간이 없으면 이상 감지 내역은 조회하지 않음
  const hasNoHistoryChoice = optionsData !== null && (deviceCode === null || days === null);

  const loadHistory = useMemo(
    () =>
      deviceCode === null || days === null
        ? null
        : (signal: AbortSignal) => fetchAnomalyHistory({ deviceCode, days }, { signal }),
    [deviceCode, days],
  );
  const history = useAsyncResource(loadHistory);
  const historyData = history.resource.status === "success" ? history.resource.data : null;
  // Card마다 자기 데이터를 다시 받는 동안 0.3초가 넘으면 옅게 하고 Click을 막음, 요약은 KPI Column, 랭킹, 커버리지, 내역은 이상 감지 내역 Card
  const isOverviewWaiting = useWaitFeedback(overview.isReloading);
  const isHistoryWaiting = useWaitFeedback(history.isReloading);

  const refresh = () => {
    overview.reload();
    filterOptions.reload();
    history.reload();
  };

  const hasError =
    overview.resource.status === "error" ||
    filterOptions.resource.status === "error" ||
    (loadHistory !== null && history.resource.status === "error");

  // 처음 조회가 다 끝나기 전에는 플릿 개요 배치와 같은 Skeleton 표시
  let content: ReactNode = <FleetSkeleton />;
  if (hasError) {
    content = (
      <p role="alert" className="text-sm text-on-danger-subtle">
        플릿 개요를 불러오지 못했습니다.
      </p>
    );
  } else if (
    overviewData !== null &&
    optionsData !== null &&
    (hasNoHistoryChoice || (historyData !== null && deviceCode !== null && days !== null))
  ) {
    const selectedRankingRow =
      overviewData.riskRanking.find(
        (row) =>
          row.deviceCode === pickedRankingRow?.deviceCode && row.segment === pickedRankingRow.segment,
      ) ??
      overviewData.riskRanking[0] ??
      null;
    content = (
      <FleetOverviewTemplate
        kpiColumn={<FleetKpiColumn summary={overviewData.summary} isWaiting={isOverviewWaiting} />}
        riskRanking={
          <RiskRankingCard
            rows={overviewData.riskRanking}
            levelThresholds={overviewData.levelThresholds}
            selectedRow={selectedRankingRow}
            onSelectRow={setPickedRankingRow}
            isWaiting={isOverviewWaiting}
          />
        }
        anomalyHistory={
          historyData !== null && deviceCode !== null && days !== null ? (
            <AnomalyHistoryCard
              history={historyData}
              devices={optionsData.devices}
              deviceCode={deviceCode}
              onDeviceChange={setPickedDeviceCode}
              dayCounts={optionsData.dayCounts}
              days={days}
              onDaysChange={setPickedDays}
              onSelectRow={() => router.push(ANOMALY_SCREEN_PATH)}
              isWaiting={isHistoryWaiting}
            />
          ) : null
        }
        modelCoverage={
          <ModelCoverageCard coverage={overviewData.coverage} isWaiting={isOverviewWaiting} />
        }
      />
    );
  }

  return (
    <>
      <PageBarActions>
        <RefreshControl
          refreshedText={`갱신 ${overviewData === null ? EMPTY_TIME : formatIsoTime(overviewData.fetchedAt)}`}
          buttonLabel="새로고침"
          onRefresh={refresh}
        />
      </PageBarActions>
      {content}
    </>
  );
}
