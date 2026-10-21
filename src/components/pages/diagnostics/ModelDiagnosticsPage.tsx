"use client";

import { useRef, useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import { DiagnosticsFilterBar } from "@/components/organisms/DiagnosticsFilterBar";
import { DiagnosticVisualizationCard } from "@/components/organisms/DiagnosticVisualizationCard";
import { LearningHealthCard } from "@/components/organisms/LearningHealthCard";
import { ModelDiagnosticsSkeleton } from "@/components/organisms/ModelDiagnosticsSkeleton";
import { SearchingOverlay } from "@/components/organisms/SearchingOverlay";
import { VaeRootCauseCard } from "@/components/organisms/VaeRootCauseCard";
import { ModelDiagnosticsTemplate } from "@/components/templates/ModelDiagnosticsTemplate";
import type { ModelDiagnostics, ModelVersion, ModelVersionQuery } from "@/domain/diagnostics";
import { useAsyncResource, type AsyncLoad } from "@/lib/useAsyncResource";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import { WAIT_FEEDBACK_DELAY_MS } from "@/lib/waitFeedback";
import { fetchAnalysisModels, fetchDevices } from "@/services/catalog";
import {
  fetchModelDiagnostics,
  fetchModelDiagnosticsOptions,
  fetchModelVersions,
} from "@/services/diagnostics";

// 화면에서 취소할 수 있도록 AbortSignal을 넘기는 조회
const loadOptions = (signal: AbortSignal) => fetchModelDiagnosticsOptions({ signal });

// 불러온 장치와 Model의 버전 List, 선택한 버전, 그 버전의 진단, 버전이 없으면 진단은 null
interface DiagnosticsView {
  query: ModelVersionQuery;
  versions: readonly ModelVersion[];
  version: string | null;
  diagnostics: ModelDiagnostics | null;
}

// 장치와 Model Input의 값, 선택하기 전에는 조회한 처음 값 사용
interface DraftFilter {
  deviceCode: string | null;
  modelCode: string | null;
}

// 장치와 Model의 버전 List를 받고 최신 버전의 진단까지 받는 조회 생성, 다 받으면 알림 호출
function createLoadRequest(query: ModelVersionQuery, onLoaded: (() => void) | null): AsyncLoad<DiagnosticsView> {
  return async (signal) => {
    const versions = await fetchModelVersions(query, { signal });
    const version = versions[0]?.version ?? null;
    const diagnostics = version === null ? null : await fetchModelDiagnostics({ ...query, version }, { signal });
    if (!signal.aborted) onLoaded?.();
    return { query, versions, version, diagnostics };
  };
}

// 받아 둔 버전 List에서 선택한 버전의 진단만 다시 받는 조회 생성
function createVersionRequest(view: DiagnosticsView, version: string): AsyncLoad<DiagnosticsView> {
  return async (signal) => ({
    ...view,
    version,
    diagnostics: await fetchModelDiagnostics({ ...view.query, version }, { signal }),
  });
}

// 모델 진단 화면에 데이터와 사용자 동작 연결
export function ModelDiagnosticsPage() {
  const [draft, setDraft] = useState<DraftFilter>({ deviceCode: null, modelCode: null });
  // 현재 진단 조회, 처음 값을 받기 전에는 null
  const [request, setRequest] = useState<AsyncLoad<DiagnosticsView> | null>(null);
  // 화면에 표시 중인 Response의 조회, 불러오기를 취소하면 이 조회로 되돌림
  const [shownRequest, setShownRequest] = useState<AsyncLoad<DiagnosticsView> | null>(null);
  // Overlay를 띄울 수 있는 조회의 번호, 없으면 null
  const [pendingSearch, setPendingSearch] = useState<number | null>(null);
  const searchCountRef = useRef(0);

  const devices = useAsyncResource(fetchDevices);
  const models = useAsyncResource(fetchAnalysisModels);
  const options = useAsyncResource(loadOptions);
  const optionsData = options.resource.status === "success" ? options.resource.data : null;

  // 처음 값을 받으면 처음 장치와 Model로 조회 시작
  if (optionsData !== null && request === null) {
    setRequest(() =>
      createLoadRequest(
        { deviceCode: optionsData.defaultDeviceCode, modelCode: optionsData.defaultModelCode },
        null,
      ),
    );
  }
  const view = useAsyncResource(request);

  // 현재 조회의 Response가 화면에 반영되면 취소할 때 돌아갈 조회로 보관
  if (request !== null && view.resource.status === "success" && !view.isReloading && shownRequest !== request) {
    setShownRequest(() => request);
  }
  // Response가 오면 Overlay를 닫음
  if (pendingSearch !== null && !view.isReloading) setPendingSearch(null);
  // Response가 0.3초 안에 오지 않을 때만 Overlay 표시
  const isOverlayOpen = useDelayedFlag(pendingSearch, WAIT_FEEDBACK_DELAY_MS);

  if (
    devices.resource.status === "error" ||
    models.resource.status === "error" ||
    options.resource.status === "error" ||
    view.resource.status === "error"
  ) {
    return (
      <p role="alert" className="text-sm text-on-danger-subtle">
        모델 진단을 불러오지 못했습니다.
      </p>
    );
  }
  if (
    devices.resource.status === "loading" ||
    models.resource.status === "loading" ||
    optionsData === null ||
    view.resource.status === "loading"
  ) {
    return <ModelDiagnosticsSkeleton />;
  }

  const shown = view.resource.data;
  const deviceCode = draft.deviceCode ?? optionsData.defaultDeviceCode;
  const modelCode = draft.modelCode ?? optionsData.defaultModelCode;

  // Overlay를 띄울 수 있는 조회 시작
  const startSearch = (load: AsyncLoad<DiagnosticsView>) => {
    searchCountRef.current += 1;
    setPendingSearch(searchCountRef.current);
    setRequest(() => load);
  };

  // Input의 장치와 Model로 버전 List를 다시 받고 최신 버전을 표시
  const loadVersions = () => {
    const query = { deviceCode, modelCode };
    startSearch(
      createLoadRequest(query, () =>
        showToast(`${query.deviceCode} · ${query.modelCode} 버전 목록을 불러와 최신 버전을 표시했습니다.`),
      ),
    );
  };

  // 선택한 버전의 진단을 조회, 현재 표시 중인 버전이면 다시 조회하지 않음
  const changeVersion = (version: string) => {
    if (version === shown.version) return;
    startSearch(createVersionRequest(shown, version));
  };

  // 조회를 취소하고 Click 전 화면 그대로 유지, Input은 바꾼 값 그대로 유지
  const cancelSearch = () => {
    if (pendingSearch === null) return;
    view.cancel();
    if (shownRequest !== null) setRequest(() => shownRequest);
    setPendingSearch(null);
  };

  return (
    <>
      <ModelDiagnosticsTemplate
        filterBar={
          <DiagnosticsFilterBar
            devices={devices.resource.data}
            deviceCode={deviceCode}
            onDeviceChange={(code) => setDraft((current) => ({ ...current, deviceCode: code }))}
            models={models.resource.data}
            modelCode={modelCode}
            onModelChange={(code) => setDraft((current) => ({ ...current, modelCode: code }))}
            onLoad={loadVersions}
            versions={shown.versions}
            version={shown.version}
            onVersionChange={changeVersion}
          />
        }
        learningHealthCard={<LearningHealthCard points={shown.diagnostics?.learningCurve ?? []} />}
        visualizationCard={
          shown.diagnostics === null ? null : (
            <DiagnosticVisualizationCard
              modelCode={shown.query.modelCode}
              visualization={shown.diagnostics.visualization}
              distribution={shown.diagnostics.scoreDistribution}
            />
          )
        }
        rootCauseCard={<VaeRootCauseCard report={shown.diagnostics?.rootCause ?? null} />}
      />
      <SearchingOverlay open={isOverlayOpen} onCancel={cancelSearch} />
    </>
  );
}
