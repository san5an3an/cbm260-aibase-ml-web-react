"use client";

import { useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import { ThresholdApplyConfirmDialog } from "@/components/organisms/ThresholdApplyConfirmDialog";
import { ThresholdPreviewCard } from "@/components/organisms/ThresholdPreviewCard";
import { ThresholdTuningFilterBar } from "@/components/organisms/ThresholdTuningFilterBar";
import { ThresholdTuningKpiRow } from "@/components/organisms/ThresholdTuningKpiRow";
import { ThresholdTuningSkeleton } from "@/components/organisms/ThresholdTuningSkeleton";
import {
  thresholdTuningNewProfileTexts,
  thresholdTuningToastTexts,
} from "@/components/organisms/thresholdTuningTexts";
import { ThresholdTuningTemplate } from "@/components/templates/ThresholdTuningTemplate";
import type {
  ModelConfig,
  ModelConfigInput,
  ModelConfigOptions,
  ModelConfigScope,
} from "@/domain/modelConfig";
import {
  clampPercentile,
  estimateThresholdFromBins,
  isBinOverThreshold,
  scorePosition,
  trainingExceedPercent,
  type ThresholdDistribution,
  type ThresholdPreview,
} from "@/domain/thresholdTuning";
import { useAsyncResource, type AsyncLoad } from "@/lib/useAsyncResource";
import { useRequestGuard } from "@/lib/useRequestGuard";
import { fetchDevices } from "@/services/catalog";
import {
  fetchModelConfigOptions,
  fetchModelConfigProfile,
  saveModelConfig,
} from "@/services/modelConfigs";
import {
  fetchThresholdDistribution,
  fetchThresholdPreview,
  fetchThresholdTuningDefaults,
} from "@/services/thresholdTuning";

// 화면에서 취소할 수 있도록 AbortSignal을 넘기는 조회
const loadDefaults = (signal: AbortSignal) => fetchThresholdTuningDefaults({ signal });
const loadOptions = (signal: AbortSignal) => fetchModelConfigOptions({ signal });

// 조건 Row에 입력 중인 범위, 불러오기를 누르기 전에는 분포에 반영하지 않음
interface DraftScope {
  deviceCode: string | null;
  modelCode: string;
  segment: string;
}

// 불러온 범위 하나의 분포와 Profile 조회, 범위와 조회 함수를 짝으로 보관
interface ScopeRequest {
  scope: ModelConfigScope;
  distribution: AsyncLoad<ThresholdDistribution>;
  profile: AsyncLoad<ModelConfig | null>;
}

// 범위의 분포와 Profile 조회 생성, 넘긴 알림 함수는 분포 조회가 취소되지 않고 성공한 뒤에만 호출
function createScopeRequest(scope: ModelConfigScope, onDistributionLoaded?: () => void): ScopeRequest {
  return {
    scope,
    distribution: async (signal) => {
      const data = await fetchThresholdDistribution(scope, { signal });
      if (!signal.aborted) onDistributionLoaded?.();
      return data;
    },
    profile: (signal) => fetchModelConfigProfile(scope, { signal }),
  };
}

// 범위와 백분위로 미리보기 조회 함수 생성
function createPreviewLoad(scope: ModelConfigScope, percentile: number): AsyncLoad<ThresholdPreview> {
  return (signal) => fetchThresholdPreview({ ...scope, percentile }, { signal });
}

// 새 Profile로 저장할 값 생성, 윈도우, 학습 방식, 가중치는 새 설정의 처음 값, Hyperparameter는 해당 Model의 프리셋 사용
function toNewProfileInput(
  scope: ModelConfigScope,
  percentile: number,
  options: ModelConfigOptions,
): ModelConfigInput {
  return {
    ...scope,
    id: null,
    name: thresholdTuningNewProfileTexts.name(percentile.toFixed(1)),
    description: thresholdTuningNewProfileTexts.description,
    thresholdPercentile: percentile,
    windowSeconds: options.defaults.windowSeconds,
    trainingMethod: options.defaults.trainingMethod,
    use: "N",
    params: options.presets[scope.modelCode] ?? [],
    sensorWeights: options.defaults.sensorWeights,
  };
}

// 기존 Profile의 임계 백분위만 바꾼 저장 값 생성, 사용 여부와 나머지 Input은 그대로
function toAppliedProfileInput(profile: ModelConfig, percentile: number): ModelConfigInput {
  return {
    id: profile.id,
    deviceCode: profile.deviceCode,
    modelCode: profile.modelCode,
    segment: profile.segment,
    name: profile.name,
    description: profile.description,
    thresholdPercentile: percentile,
    windowSeconds: profile.windowSeconds,
    trainingMethod: profile.trainingMethod,
    use: profile.use,
    params: profile.params,
    sensorWeights: profile.sensorWeights,
  };
}

// 기존 Profile에 반영하기 전에 확인할 대상
interface ApplyConfirm {
  profile: ModelConfig;
  percentile: number;
}

// 임계값 튜닝 Page에 데이터와 사용자 행동 연결
export function ThresholdTuningPage() {
  const devices = useAsyncResource(fetchDevices);
  const options = useAsyncResource(loadOptions);
  const defaults = useAsyncResource(loadDefaults);
  const [draft, setDraft] = useState<DraftScope | null>(null);
  const [scopeRequest, setScopeRequest] = useState<ScopeRequest | null>(null);
  // Slider와 Input의 백분위, 놓거나 입력을 마치면 미리보기를 다시 조회
  const [percentile, setPercentile] = useState<number | null>(null);
  // Input에 입력 중인 Text, 입력을 마치면 null
  const [percentileText, setPercentileText] = useState<string | null>(null);
  // Slider를 Drag하는 중이면 그 백분위, 놓기 전까지 미리보기 선이 학습 분포 기준 근사값으로 따라 움직임
  const [draggingPercentile, setDraggingPercentile] = useState<number | null>(null);
  const [previewLoad, setPreviewLoad] = useState<AsyncLoad<ThresholdPreview> | null>(null);
  const [showsDeviceError, setShowsDeviceError] = useState(false);
  const [applyConfirm, setApplyConfirm] = useState<ApplyConfirm | null>(null);
  const { isRequesting, request } = useRequestGuard((failureText) => showToast(failureText, "error"));

  const defaultsData = defaults.resource.status === "success" ? defaults.resource.data : null;
  // 처음 범위를 받으면 그 범위와 백분위로 분포, Profile, 미리보기 조회 시작
  if (defaultsData !== null && scopeRequest === null) {
    const { scope } = defaultsData;
    setDraft({ deviceCode: scope.deviceCode, modelCode: scope.modelCode, segment: scope.segment });
    setScopeRequest(createScopeRequest(scope));
    setPercentile(defaultsData.percentile);
    setPreviewLoad(() => createPreviewLoad(scope, defaultsData.percentile));
  }
  const distribution = useAsyncResource(scopeRequest?.distribution ?? null);
  const profile = useAsyncResource(scopeRequest?.profile ?? null);
  const preview = useAsyncResource(previewLoad);

  if (
    devices.resource.status === "error" ||
    options.resource.status === "error" ||
    defaults.resource.status === "error" ||
    distribution.resource.status === "error" ||
    profile.resource.status === "error" ||
    preview.resource.status === "error"
  ) {
    return (
      <p role="alert" className="text-sm text-on-danger-subtle">
        임계 튜닝을 불러오지 못했습니다.
      </p>
    );
  }
  if (
    devices.resource.status === "loading" ||
    options.resource.status === "loading" ||
    draft === null ||
    scopeRequest === null ||
    percentile === null ||
    distribution.resource.status === "loading" ||
    profile.resource.status === "loading" ||
    preview.resource.status === "loading"
  ) {
    return <ThresholdTuningSkeleton />;
  }

  const optionsData = options.resource.data;
  const shown = distribution.resource.data;
  const shownScope: ModelConfigScope = {
    deviceCode: shown.deviceCode,
    modelCode: shown.modelCode,
    segment: shown.segment,
  };
  const shownProfile = profile.resource.data;
  const shownPreview = preview.resource.data;
  const isReloading = distribution.isReloading || profile.isReloading || preview.isReloading;
  const isBusy = isRequesting || isReloading;
  const range = optionsData.percentileRange;

  // 백분위를 확정하고 현재 범위로 미리보기를 다시 조회
  const commitPercentile = (value: number) => {
    const next = clampPercentile(value, range);
    setPercentile(next);
    setPercentileText(null);
    setDraggingPercentile(null);
    setPreviewLoad(() => createPreviewLoad(scopeRequest.scope, next));
  };
  const commitPercentileText = () => {
    if (percentileText === null) return;
    const value = Number(percentileText);
    if (percentileText.trim() === "" || Number.isNaN(value)) setPercentileText(null);
    else commitPercentile(value);
  };
  // 장치를 골랐으면 조건 Row의 범위로 분포, Profile, 미리보기를 다시 조회
  const loadScope = () => {
    if (draft.deviceCode === null) {
      setShowsDeviceError(true);
      return;
    }
    const scope: ModelConfigScope = {
      deviceCode: draft.deviceCode,
      modelCode: draft.modelCode,
      segment: draft.segment.trim() || optionsData.defaults.segment,
    };
    setScopeRequest(
      createScopeRequest(scope, () => showToast(thresholdTuningToastTexts.loaded(scope.deviceCode, scope.modelCode))),
    );
    setPreviewLoad(() => createPreviewLoad(scope, percentile));
  };
  const saveNewProfile = async () => {
    const isDone = await request(
      () => saveModelConfig(toNewProfileInput(shownScope, percentile, optionsData)),
      thresholdTuningToastTexts.saveFailed,
    );
    if (!isDone) return;
    showToast(thresholdTuningToastTexts.savedNew);
    profile.reload();
  };
  const openApply = () => {
    if (shownProfile === null) {
      showToast(thresholdTuningToastTexts.noProfile);
      return;
    }
    setApplyConfirm({ profile: shownProfile, percentile });
  };
  const confirmApply = async () => {
    if (applyConfirm === null) return;
    const isDone = await request(
      () => saveModelConfig(toAppliedProfileInput(applyConfirm.profile, applyConfirm.percentile)),
      thresholdTuningToastTexts.saveFailed,
    );
    if (!isDone) return;
    setApplyConfirm(null);
    showToast(thresholdTuningToastTexts.applied);
    profile.reload();
  };

  // 분포 Chart의 미리보기 선 임계값, Drag 중이면 근사값, 놓으면 Server가 계산한 값
  const linePreviewThreshold =
    draggingPercentile === null ? shownPreview.threshold : estimateThresholdFromBins(shown.bins, draggingPercentile);
  return (
    <>
      <ThresholdTuningTemplate
        filterBar={
          <ThresholdTuningFilterBar
            devices={devices.resource.data}
            deviceCode={draft.deviceCode}
            onDeviceChange={(deviceCode) => {
              setDraft({ ...draft, deviceCode });
              if (deviceCode !== null) setShowsDeviceError(false);
            }}
            modelCodes={optionsData.modelCodes}
            modelCode={draft.modelCode}
            onModelChange={(modelCode) => setDraft({ ...draft, modelCode })}
            segment={draft.segment}
            onSegmentChange={(segment) => setDraft({ ...draft, segment })}
            showsDeviceError={showsDeviceError}
            trainingWindowCount={shown.trainingWindowCount}
            onLoad={loadScope}
            disabled={isRequesting}
          />
        }
        kpiRow={
          <ThresholdTuningKpiRow
            savedThreshold={shown.savedThreshold}
            previewThreshold={shownPreview.threshold}
            percentile={percentile}
            trainingExceedPercent={trainingExceedPercent(percentile)}
            savedOperatingRatePercent={shown.savedOperatingAnomalyRatePercent}
            previewOperatingRatePercent={shownPreview.operatingAnomalyRatePercent}
            previewOperatingWindowCount={shownPreview.operatingAnomalyWindowCount}
            operatingWindowCount={shown.operatingWindowCount}
          />
        }
        previewCard={
          <ThresholdPreviewCard
            scope={shownScope}
            modelVersion={shown.modelVersion}
            operatingDates={shown.operatingDates}
            overflowOperatingCount={shown.overflowOperatingCount}
            bins={shown.bins}
            trainingWindowCount={shown.trainingWindowCount}
            operatingWindowCount={shown.operatingWindowCount}
            savedThreshold={shown.savedThreshold}
            previewThreshold={linePreviewThreshold}
            isPreviewEstimate={draggingPercentile !== null}
            savedPosition={scorePosition(shown.bins, shown.savedThreshold)}
            previewPosition={scorePosition(shown.bins, linePreviewThreshold)}
            overPreview={shown.bins.map((bin) => isBinOverThreshold(bin, linePreviewThreshold))}
            percentileRange={range}
            percentile={percentile}
            percentileText={percentileText ?? percentile.toFixed(1)}
            onPercentileDrag={(value) => {
              setPercentile(value);
              setDraggingPercentile(value);
            }}
            onPercentileCommit={commitPercentile}
            onPercentileTextChange={setPercentileText}
            onPercentileTextCommit={commitPercentileText}
            profile={shownProfile}
            onSaveNew={() => void saveNewProfile()}
            onApply={openApply}
            disabled={isBusy}
            isReloading={isReloading}
          />
        }
      />
      <ThresholdApplyConfirmDialog
        open={applyConfirm !== null}
        profileName={applyConfirm?.profile.name ?? ""}
        fromPercentile={applyConfirm?.profile.thresholdPercentile ?? 0}
        toPercentile={applyConfirm?.percentile ?? 0}
        use={applyConfirm?.profile.use ?? ""}
        isConfirming={isRequesting}
        onConfirm={() => void confirmApply()}
        onCancel={() => {
          if (!isRequesting) setApplyConfirm(null);
        }}
      />
    </>
  );
}
