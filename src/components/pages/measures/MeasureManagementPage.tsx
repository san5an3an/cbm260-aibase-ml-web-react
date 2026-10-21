"use client";

import { useMemo, useRef, useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import { ActionEffectCompareModal } from "@/components/organisms/ActionEffectCompareModal";
import { MeasureActionModal } from "@/components/organisms/MeasureActionModal";
import { MeasureAssigneeModal } from "@/components/organisms/MeasureAssigneeModal";
import { MeasureBulkCompleteDialog } from "@/components/organisms/MeasureBulkCompleteDialog";
import { MeasureFilterBar } from "@/components/organisms/MeasureFilterBar";
import { MeasureKpiRow } from "@/components/organisms/MeasureKpiRow";
import { measureToastTexts } from "@/components/organisms/measureToastTexts";
import { MeasureWorklistCard } from "@/components/organisms/MeasureWorklistCard";
import { MeasuresSkeleton } from "@/components/organisms/MeasuresSkeleton";
import { SearchingOverlay } from "@/components/organisms/SearchingOverlay";
import { SensorFrequencyRankingCard } from "@/components/organisms/SensorFrequencyRankingCard";
import { useMeasureModalState } from "@/components/pages/measures/measureModalState";
import { MeasureManagementTemplate } from "@/components/templates/MeasureManagementTemplate";
import {
  createMeasureActionDraft,
  rateMeasureEffectComparison,
  toMeasureActionInput,
} from "@/domain/measures";
import type {
  Measure,
  MeasureActionDraft,
  MeasureComparePreset,
  MeasureEffectConditions,
  MeasureEffectSortKey,
  MeasureFilter,
  MeasureId,
  MeasureWorklist,
  MeasureWorklistQuery,
} from "@/domain/measures";
import type { DateRange } from "@/domain/period";
import { datedFileName, saveFile } from "@/lib/downloadFile";
import { useAsyncResource, type AsyncLoad } from "@/lib/useAsyncResource";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import { useRequestGuard } from "@/lib/useRequestGuard";
import { useWaitFeedback } from "@/lib/useWaitFeedback";
import { WAIT_FEEDBACK_DELAY_MS } from "@/lib/waitFeedback";
import { fetchDevices } from "@/services/catalog";
import {
  assignMeasures,
  completeMeasures,
  exportMeasureCsv,
  fetchMeasureActionOptions,
  fetchMeasureAssignees,
  fetchMeasureEffectComparison,
  fetchMeasureEffectOptions,
  fetchMeasureFilterOptions,
  fetchMeasureSummary,
  fetchMeasureWorklist,
  fetchSensorFrequencyRanking,
  saveMeasureAction,
} from "@/services/measures";

const EMPTY_FILTER: MeasureFilter = { deviceCode: null, actionYn: null, inspectionYn: null };
const NO_SELECTION: ReadonlySet<MeasureId> = new Set();
// 내려받는 CSV 파일 이름의 앞부분, 뒤에 내려받은 시각을 붙임
const CSV_FILE_BASE_NAME = "measures-worklist";

// 화면에서 취소할 수 있도록 AbortSignal을 넘기는 조회
const loadFilterOptions = (signal: AbortSignal) => fetchMeasureFilterOptions({ signal });
const loadActionOptions = (signal: AbortSignal) => fetchMeasureActionOptions({ signal });
const loadEffectOptions = (signal: AbortSignal) => fetchMeasureEffectOptions({ signal });
const loadAssignees = (signal: AbortSignal) => fetchMeasureAssignees({ signal });
const loadSummary = (signal: AbortSignal) => fetchMeasureSummary({ signal });
const loadRanking = (signal: AbortSignal) => fetchSensorFrequencyRanking({ signal });

// 조치 효과 비교에서 마지막으로 비교한 조건, Row의 조치일에서 열어 아직 다시 비교하지 않았으면 표시
interface AppliedEffectConditions {
  conditions: MeasureEffectConditions;
  isActionDatePreset: boolean;
}

// 워크List 조회 1건의 조건, 기간, Page와 그 조건으로 호출하는 조회 함수를 함께 보관(취소하면 앞의 조회를 그대로 되돌려 다시 호출하지 않음)
interface WorklistRequest {
  query: MeasureWorklistQuery;
  load: AsyncLoad<MeasureWorklist>;
}

// 조건, 기간, Page로 워크List 조회 1건 생성
function createWorklistRequest(query: MeasureWorklistQuery): WorklistRequest {
  return { query, load: (signal) => fetchMeasureWorklist(query, { signal }) };
}

// 검색, 초기화, 기간 변경으로 시작해 Response를 기다리는 조회, 오래 걸리면 Overlay를 띄우고 취소할 수 있음
interface PendingSearch {
  id: number;
  // 요약과 순위도 다시 조회한 검색인지 여부, 기간 변경은 List만 다시 조회
  reloadsSummary: boolean;
  // 검색 전에 선택한 Row, 검색이 비운 선택을 취소하면 되돌림
  selectedIdsBefore: ReadonlySet<MeasureId>;
}

// 조치 관리 화면에 데이터와 사용자 동작 연결
export function MeasureManagementPage() {
  // 장치, 조치 여부, 검수 여부 Input의 값, 검색 Click 전에는 반영하지 않음
  const [draftFilter, setDraftFilter] = useState<MeasureFilter>(EMPTY_FILTER);
  // 발생 기간 Input의 값, 선택하는 즉시 조회하지만 취소하면 Input은 선택한 값 유지, 처음 기간을 받기 전에는 null
  const [draftPeriod, setDraftPeriod] = useState<DateRange | null>(null);
  // 현재 워크List 조회에 쓴 조건, 기간, Page, 처음 기간을 받기 전에는 null
  const [worklistRequest, setWorklistRequest] = useState<WorklistRequest | null>(null);
  // Table에 표시 중인 Response의 조회, 검색을 취소하면 이 조회로 되돌림
  const [shownWorklistRequest, setShownWorklistRequest] = useState<WorklistRequest | null>(null);
  // Overlay를 띄울 수 있는 조회, 없으면 null
  const [pendingSearch, setPendingSearch] = useState<PendingSearch | null>(null);
  const searchCountRef = useRef(0);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<MeasureId>>(NO_SELECTION);
  // Request 중에는 실행 Button과 Modal의 닫기를 막고 실패하면 Toast 표시
  const { isRequesting, request, unlessRequesting } = useRequestGuard((failureText) =>
    showToast(failureText, "error"),
  );
  const modalState = useMeasureModalState();
  // Modal에서 편집 중인 값, 닫힌 뒤에도 사라지는 동안 내용이 보이도록 유지
  const [actionDraft, setActionDraft] = useState<MeasureActionDraft | null>(null);
  const [assignee, setAssignee] = useState<string | null>(null);
  const [assignComment, setAssignComment] = useState("");
  const [hasTriedAssign, setHasTriedAssign] = useState(false);
  const [effectDraft, setEffectDraft] = useState<MeasureEffectConditions | null>(null);
  const [effectSort, setEffectSort] = useState<MeasureEffectSortKey | null>(null);
  const [appliedEffect, setAppliedEffect] = useState<AppliedEffectConditions | null>(null);

  const devices = useAsyncResource(fetchDevices);
  const filterOptions = useAsyncResource(loadFilterOptions);
  const actionOptions = useAsyncResource(loadActionOptions);
  const effectOptions = useAsyncResource(loadEffectOptions);
  const assignees = useAsyncResource(loadAssignees);
  const summary = useAsyncResource(loadSummary);
  const ranking = useAsyncResource(loadRanking);

  // 처음 조회 기간을 받으면 그 기간을 Input에 채우고 List 조회 시작
  const options = filterOptions.resource.status === "success" ? filterOptions.resource.data : null;
  if (options !== null && worklistRequest === null) {
    setDraftPeriod(options.defaultPeriod);
    setWorklistRequest(
      createWorklistRequest({ ...EMPTY_FILTER, period: options.defaultPeriod, page: 1 }),
    );
  }
  const worklist = useAsyncResource(worklistRequest?.load ?? null);

  // 비교 Click이나 Sort 변경 때마다 조치 효과를 다시 조회, 비교하기 전에는 조회하지 않음
  const loadEffect = useMemo(() => {
    if (appliedEffect === null || effectSort === null) return null;
    const query = { ...appliedEffect.conditions, sort: effectSort };
    return (signal: AbortSignal) => fetchMeasureEffectComparison(query, { signal });
  }, [appliedEffect, effectSort]);
  const effect = useAsyncResource(loadEffect);

  // 현재 조회의 Response가 Table에 반영되면 그 조회를 취소할 때 돌아갈 조회로 보관
  if (
    worklistRequest !== null &&
    worklist.resource.status === "success" &&
    !worklist.isReloading &&
    shownWorklistRequest !== worklistRequest
  ) {
    setShownWorklistRequest(worklistRequest);
  }
  // 검색이 다시 호출한 조회가 모두 끝나면 Overlay를 닫음
  if (
    pendingSearch !== null &&
    !worklist.isReloading &&
    !summary.isReloading &&
    !ranking.isReloading
  ) {
    setPendingSearch(null);
  }
  // Response가 0.3초 안에 오지 않을 때만 Overlay 표시
  const isOverlayOpen = useDelayedFlag(pendingSearch?.id ?? null, WAIT_FEEDBACK_DELAY_MS);
  // List를 0.3초 넘게 다시 받는 동안에만 이전 Row를 옅게 하고 그 Row로 Modal을 열지 않음
  const isListStale = useWaitFeedback(worklist.isReloading);

  // List, 요약, 순위를 다시 조회
  const reloadMeasureData = () => {
    worklist.reload();
    summary.reload();
    ranking.reload();
  };

  const resources = [
    devices,
    filterOptions,
    actionOptions,
    effectOptions,
    assignees,
    summary,
    ranking,
    worklist,
  ];
  // 조치 효과 비교는 Modal 안의 조회라 화면 Rendering 조건과 화면 전체 오류 판정에서 제외
  if (resources.some(({ resource }) => resource.status === "error")) {
    return (
      <p role="alert" className="text-sm text-on-danger-subtle">
        조치 관리를 불러오지 못했습니다.
      </p>
    );
  }
  if (
    options === null ||
    draftPeriod === null ||
    worklistRequest === null ||
    devices.resource.status !== "success" ||
    actionOptions.resource.status !== "success" ||
    effectOptions.resource.status !== "success" ||
    assignees.resource.status !== "success" ||
    summary.resource.status !== "success" ||
    ranking.resource.status !== "success" ||
    worklist.resource.status !== "success"
  ) {
    return <MeasuresSkeleton />;
  }

  const worklistQuery = worklistRequest.query;
  const measureActionOptions = actionOptions.resource.data;
  const measureEffectOptions = effectOptions.resource.data;
  const deviceList = devices.resource.data;
  const { rows, pageCount } = worklist.resource.data;
  // Page 수가 줄어 현재 Page가 없어지면 마지막 Page로 옮겨 다시 조회
  const lastPage = Math.max(1, pageCount);
  if (worklistQuery.page > lastPage) {
    setWorklistRequest(createWorklistRequest({ ...worklistQuery, page: lastPage }));
  }
  // 일괄 확인과 담당자 지정의 대상을 현재 표시된 Row 중 선택한 건으로 한정
  const selectedRows = rows.filter((row) => selectedIds.has(row.id));

  // Overlay를 띄울 수 있는 조회 시작, List는 넘긴 조회로, 요약과 순위는 reloadsSummary일 때 다시 조회
  const startSearch = (nextRequest: WorklistRequest, reloadsSummary: boolean) => {
    searchCountRef.current += 1;
    setPendingSearch({ id: searchCountRef.current, reloadsSummary, selectedIdsBefore: selectedIds });
    setWorklistRequest(nextRequest);
    if (reloadsSummary) {
      summary.reload();
      ranking.reload();
    }
  };

  // 조건이 그대로여도 검색을 Click하면 Input의 조건과 기간으로 첫 Page부터 다시 조회, 선택한 Row는 비움
  const applyFilter = () => {
    startSearch(createWorklistRequest({ ...draftFilter, period: draftPeriod, page: 1 }), true);
    setSelectedIds(NO_SELECTION);
  };

  // 이미 처음 조건이어도 초기화를 Click하면 다시 조회, 선택한 Row는 그대로 유지
  const resetFilter = () => {
    setDraftFilter(EMPTY_FILTER);
    setDraftPeriod(options.defaultPeriod);
    startSearch(
      createWorklistRequest({ ...EMPTY_FILTER, period: options.defaultPeriod, page: 1 }),
      true,
    );
  };

  // 기간을 선택하면 바로 첫 Page부터 다시 조회, 종료일까지 선택하면 검색처럼 Overlay 표시, 시작일만 선택한 동안은 옅게 하고 Click을 막음
  const changePeriod = (next: DateRange) => {
    setDraftPeriod(next);
    const nextRequest = createWorklistRequest({ ...worklistQuery, period: next, page: 1 });
    if (next.to === null) setWorklistRequest(nextRequest);
    else startSearch(nextRequest, false);
  };

  // 다른 Page를 선택하면 같은 조건으로 그 Page 조회
  const changePage = (nextPage: number) => {
    if (nextPage === worklistQuery.page) return;
    setWorklistRequest(createWorklistRequest({ ...worklistQuery, page: nextPage }));
  };

  // 검색을 취소하고 List, Page 번호, 요약, 순위, 선택한 Row를 검색 전으로 되돌림, Input은 바꾼 값 그대로 유지
  const cancelSearch = () => {
    if (pendingSearch === null) return;
    if (pendingSearch.reloadsSummary) {
      summary.cancel();
      ranking.cancel();
    }
    worklist.cancel();
    if (shownWorklistRequest !== null) setWorklistRequest(shownWorklistRequest);
    setSelectedIds(pendingSearch.selectedIdsBefore);
    setPendingSearch(null);
  };

  const toggleRow = (measureId: MeasureId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(measureId)) next.add(measureId);
      return next;
    });
  };

  // 표시된 Row가 전부 선택돼 있으면 선택을 비우고 아니면 표시된 Row 전부 선택
  const toggleAllRows = () => {
    const isAllSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
    setSelectedIds(isAllSelected ? NO_SELECTION : new Set(rows.map((row) => row.id)));
  };

  // 현재 화면에 적용된 조건과 기간의 List 전부를 받아 CSV 파일로 저장, 받지 못하면 파일 없이 실패 Toast 표시
  const exportCsv = async () => {
    if (isRequesting) return;
    const query = {
      deviceCode: worklistQuery.deviceCode,
      actionYn: worklistQuery.actionYn,
      inspectionYn: worklistQuery.inspectionYn,
      period: worklistQuery.period,
    };
    const isDone = await request(async () => {
      const content = await exportMeasureCsv(query);
      saveFile(content, datedFileName(CSV_FILE_BASE_NAME, "csv", new Date()));
    }, measureToastTexts.exportFailed);
    if (isDone) showToast(measureToastTexts.exported);
  };

  // 조치일이 없는 건은 조회로 받은 처음 날짜를 채워 조치 Modal 열기, Request 중에 열면 닫히지 않으므로 열지 않음
  const openAction = (measure: Measure) => {
    if (isRequesting || isListStale) return;
    setActionDraft(createMeasureActionDraft(measure, measureActionOptions.defaultActionDate));
    modalState.open({ type: "action", measure });
  };

  const actionTarget = modalState.last.action?.measure ?? null;

  const submitAction = async () => {
    if (actionTarget === null || actionDraft === null) return;
    const measureId = actionTarget.id;
    const input = toMeasureActionInput(actionDraft);
    const isDone = await request(
      () => saveMeasureAction(measureId, input),
      measureToastTexts.saveFailed,
    );
    if (!isDone) return;
    modalState.close();
    reloadMeasureData();
    showToast(measureToastTexts.saved);
  };

  // 비교 조건을 처음 값으로 채워 열기, Row의 조치일에서 열면 그 편성, 호차, 조치일로 바로 비교
  const openCompare = (preset: MeasureComparePreset | null) => {
    const conditions: MeasureEffectConditions =
      preset === null
        ? measureEffectOptions.defaultConditions
        : {
            ...measureEffectOptions.defaultConditions,
            formation: preset.formation,
            car: preset.car,
            baseDate: preset.baseDate,
          };
    setEffectDraft(conditions);
    setEffectSort(measureEffectOptions.defaultSort);
    setAppliedEffect(preset === null ? null : { conditions, isActionDatePreset: true });
    modalState.open({ type: "compare" });
  };

  // Row의 조치일에서 열면 그 편성, 호차, 조치일을 비교 조건으로 채움
  const openCompareFor = (measure: Measure) => {
    if (isListStale || measure.actionDate === null) return;
    openCompare({ formation: measure.formation, car: measure.car, baseDate: measure.actionDate });
  };

  // 조건이 그대로여도 비교를 Click하면 다시 조회
  const runCompare = () => {
    if (effectDraft === null) return;
    setAppliedEffect({ conditions: effectDraft, isActionDatePreset: false });
  };

  // 다시 받는 동안에는 이전 조건으로 받은 결과와 실패를 표시하지 않음
  const effectResult =
    loadEffect !== null && effect.resource.status === "success" && !effect.isReloading
      ? rateMeasureEffectComparison(effect.resource.data)
      : null;
  const isEffectFailed =
    loadEffect !== null && effect.resource.status === "error" && !effect.isReloading;

  const openBulkComplete = () => {
    if (isRequesting || isListStale) return;
    modalState.open({ type: "bulkComplete", measures: selectedRows });
  };

  const bulkTargets = modalState.last.bulkComplete?.measures ?? [];

  // 선택한 건 전부를 조치완료로 바꾸고 선택을 비움
  const confirmBulkComplete = async () => {
    const measureIds = bulkTargets.map((measure) => measure.id);
    const isDone = await request(
      () => completeMeasures(measureIds),
      measureToastTexts.completeFailed,
    );
    if (!isDone) return;
    modalState.close();
    setSelectedIds(NO_SELECTION);
    reloadMeasureData();
    showToast(measureToastTexts.completed);
  };

  const openAssign = () => {
    if (isRequesting || isListStale) return;
    setAssignee(null);
    setAssignComment("");
    setHasTriedAssign(false);
    modalState.open({ type: "assign", measures: selectedRows });
  };

  const assignTargets = modalState.last.assign?.measures ?? [];

  // 담당자를 선택하지 않았으면 오류만 표시하고 선택했으면 선택한 건 전부에 지정
  const submitAssign = async () => {
    if (assignee === null) {
      setHasTriedAssign(true);
      return;
    }
    const measureIds = assignTargets.map((measure) => measure.id);
    const input = { assignee, comment: assignComment.trim() || null };
    const isDone = await request(
      () => assignMeasures(measureIds, input),
      measureToastTexts.assignFailed,
    );
    if (!isDone) return;
    modalState.close();
    setSelectedIds(NO_SELECTION);
    reloadMeasureData();
    showToast(measureToastTexts.assigned(measureIds.length));
  };

  // 조치 효과 비교에서 선택할 수 있는 장치, 조회한 순서대로 장치 이름과 짝지음
  const effectDevices = measureEffectOptions.deviceCodes.flatMap((code) => {
    const device = deviceList.find((candidate) => candidate.code === code);
    return device ? [device] : [];
  });

  return (
    <>
      <MeasureManagementTemplate
        filterBar={
          <MeasureFilterBar
            devices={deviceList}
            actionStates={options.actionStates}
            inspectionStates={options.inspectionStates}
            filter={draftFilter}
            onFilterChange={setDraftFilter}
            period={draftPeriod}
            onPeriodChange={changePeriod}
            selectablePeriod={options.selectablePeriod}
            onReset={resetFilter}
            onSearch={applyFilter}
            onOpenCompare={() => openCompare(null)}
            onExportCsv={() => void exportCsv()}
            isExportDisabled={isRequesting}
          />
        }
        kpiRow={<MeasureKpiRow summary={summary.resource.data} />}
        worklistCard={
          <MeasureWorklistCard
            rows={rows}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onToggleAll={toggleAllRows}
            onCompleteSelected={openBulkComplete}
            onAssignSelected={openAssign}
            isBulkActionDisabled={isRequesting || isListStale}
            isProcessDisabled={isRequesting || isListStale}
            isActionDateDisabled={isListStale}
            onProcess={openAction}
            onCompare={openCompareFor}
            onResetFilter={resetFilter}
            page={worklistQuery.page}
            pageCount={pageCount}
            onPageChange={changePage}
          />
        }
        rankingCard={<SensorFrequencyRankingCard rows={ranking.resource.data} />}
      />
      {actionDraft ? (
        <MeasureActionModal
          open={modalState.openType === "action"}
          measure={actionTarget}
          options={measureActionOptions}
          draft={actionDraft}
          onDraftChange={setActionDraft}
          isSubmitting={isRequesting}
          onSubmit={() => void submitAction()}
          onClose={unlessRequesting(modalState.close)}
        />
      ) : null}
      {effectDraft && effectSort ? (
        <ActionEffectCompareModal
          open={modalState.openType === "compare"}
          onClose={modalState.close}
          devices={effectDevices}
          options={measureEffectOptions}
          conditions={effectDraft}
          onConditionsChange={setEffectDraft}
          sort={effectSort}
          onSortChange={setEffectSort}
          onCompare={runCompare}
          appliedConditions={appliedEffect?.conditions ?? null}
          isActionDatePreset={appliedEffect?.isActionDatePreset ?? false}
          result={effectResult}
          isResultFailed={isEffectFailed}
        />
      ) : null}
      <MeasureBulkCompleteDialog
        open={modalState.openType === "bulkComplete"}
        measures={bulkTargets}
        isConfirming={isRequesting}
        onConfirm={() => void confirmBulkComplete()}
        onCancel={unlessRequesting(modalState.close)}
      />
      <MeasureAssigneeModal
        open={modalState.openType === "assign"}
        measures={assignTargets}
        assignees={assignees.resource.data}
        assignee={assignee}
        onAssigneeChange={setAssignee}
        comment={assignComment}
        onCommentChange={setAssignComment}
        showAssigneeError={hasTriedAssign && assignee === null}
        isSubmitting={isRequesting}
        onSubmit={() => void submitAssign()}
        onClose={unlessRequesting(modalState.close)}
      />
      <SearchingOverlay open={isOverlayOpen} onCancel={cancelSearch} />
    </>
  );
}
