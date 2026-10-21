"use client";

import { useMemo, useRef, useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import {
  ModelConfigModal,
  type ModelConfigModalContent,
} from "@/components/organisms/ModelConfigModal";
import { modelConfigTexts, modelConfigToastTexts } from "@/components/organisms/modelConfigTexts";
import { SearchingOverlay } from "@/components/organisms/SearchingOverlay";
import { TrainingFilterBar } from "@/components/organisms/TrainingFilterBar";
import { TrainingJobCancelConfirmDialog } from "@/components/organisms/TrainingJobCancelConfirmDialog";
import { TrainingJobDetailModal } from "@/components/organisms/TrainingJobDetailModal";
import { TrainingJobsCard } from "@/components/organisms/TrainingJobsCard";
import { TrainingKpiRow } from "@/components/organisms/TrainingKpiRow";
import { TrainingResultDetailModal } from "@/components/organisms/TrainingResultDetailModal";
import { TrainingResultsCard } from "@/components/organisms/TrainingResultsCard";
import { TrainingScheduleModal } from "@/components/organisms/TrainingScheduleModal";
import { TrainingSkeleton } from "@/components/organisms/TrainingSkeleton";
import { trainingToastTexts } from "@/components/organisms/trainingToastTexts";
import { useModelConfigEditor } from "@/components/pages/model-config/useModelConfigEditor";
import { useTrainingModalState } from "@/components/pages/training/trainingModalState";
import { TrainingSettingsTemplate } from "@/components/templates/TrainingSettingsTemplate";
import { createModelConfigDraft, createNewModelConfigDraft } from "@/domain/modelConfig";
import type { DateRange } from "@/domain/period";
import {
  createTrainingScheduleDraft,
  findTrainingScheduleProblem,
  hasTrainingScheduleFieldChanged,
  toTrainingScheduleInput,
  trainingScheduleProblemField,
  type TrainingJob,
  type TrainingJobId,
  type TrainingResult,
  type TrainingResultFilter,
  type TrainingResultId,
  type TrainingResultPage,
  type TrainingResultQuery,
  type TrainingResultSort,
  type TrainingResultSortKey,
  type TrainingScheduleDraft,
  type TrainingScheduleField,
  type TrainingScheduleProblem,
} from "@/domain/training";
import { datedFileName, saveFile } from "@/lib/downloadFile";
import { useAsyncResource, type AsyncLoad } from "@/lib/useAsyncResource";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import { useRequestGuard } from "@/lib/useRequestGuard";
import { useWaitFeedback } from "@/lib/useWaitFeedback";
import { WAIT_FEEDBACK_DELAY_MS } from "@/lib/waitFeedback";
import { fetchAnalysisModels, fetchDevices } from "@/services/catalog";
import {
  fetchModelConfigOptions,
  fetchModelConfigProfile,
  saveModelConfig,
} from "@/services/modelConfigs";
import {
  cancelTrainingJob,
  exportTrainingResultsCsv,
  fetchTrainingFilterOptions,
  fetchTrainingJobDetail,
  fetchTrainingJobs,
  fetchTrainingResultDetail,
  fetchTrainingResults,
  fetchTrainingScheduleOptions,
  fetchTrainingSummary,
  retryTrainingJob,
  scheduleTraining,
} from "@/services/training";

const EMPTY_FILTER: TrainingResultFilter = { modelCode: null, deviceCode: null };
// 내려받는 CSV 파일 이름의 앞부분, 뒤에 내려받은 시각을 붙임
const CSV_FILE_BASE_NAME = "training-results";

// 화면에서 취소할 수 있도록 AbortSignal을 넘기는 조회
const loadFilterOptions = (signal: AbortSignal) => fetchTrainingFilterOptions({ signal });
const loadSummary = (signal: AbortSignal) => fetchTrainingSummary({ signal });
const loadJobs = (signal: AbortSignal) => fetchTrainingJobs({ signal });
const loadScheduleOptions = (signal: AbortSignal) => fetchTrainingScheduleOptions({ signal });

// 예약을 눌렀을 때 찾은 사유와 그 사유를 표시할 Input
interface ScheduleProblem {
  reason: TrainingScheduleProblem;
  field: TrainingScheduleField;
}

// 처음 정렬, 학습 일시의 최신순
const DEFAULT_SORT: TrainingResultSort = { key: "trainedAt", direction: "desc" };

// 결과 조회 1회분, 조건, 기간, 정렬, Page, Page 크기와 그 조건으로 호출하는 조회 함수를 짝으로 보관(취소하면 이전 조회를 다시 호출하지 않고 그대로 되돌림)
interface ResultRequest {
  query: TrainingResultQuery;
  load: AsyncLoad<TrainingResultPage>;
}

// 조건, 기간, 정렬, Page, Page 크기로 결과 조회 1회분 생성
function createResultRequest(query: TrainingResultQuery): ResultRequest {
  return { query, load: (signal) => fetchTrainingResults(query, { signal }) };
}

// 재학습 설정 화면에 데이터와 사용자 행동 연결
export function TrainingSettingsPage() {
  // 학습 Model, 장치, 학습 일시 Input 값, 검색을 누르기 전에는 반영하지 않고 검색을 취소해도 선택한 값 그대로 유지, 처음 기간을 받기 전에는 null
  const [draftFilter, setDraftFilter] = useState<TrainingResultFilter>(EMPTY_FILTER);
  const [draftPeriod, setDraftPeriod] = useState<DateRange | null>(null);
  // 현재 결과 조회에 사용한 조건, 기간, 정렬, Page, Page 크기, 처음 값을 받기 전에는 null
  const [resultRequest, setResultRequest] = useState<ResultRequest | null>(null);
  // 결과 Table에 표시 중인 응답의 조회, 검색을 취소하면 이 조회로 되돌림
  const [shownResultRequest, setShownResultRequest] = useState<ResultRequest | null>(null);
  // Loading Overlay를 띄울 수 있는 검색의 번호, 없으면 null
  const [pendingSearchId, setPendingSearchId] = useState<number | null>(null);
  const searchCountRef = useRef(0);
  // 마지막으로 연 Job Card와 결과 Row, 연 적이 없으면 처음 받은 목록의 첫 항목으로 채움
  const [pickedJobId, setPickedJobId] = useState<TrainingJobId | null>(null);
  const [pickedResultId, setPickedResultId] = useState<TrainingResultId | null>(null);
  // Request 중에는 실행 Button과 Modal의 닫기를 비활성화하고, 요청 중 닫기가 막히는 Modal을 여는 Button도 비활성화, 실패하면 알림 표시
  const { isRequesting, request, unlessRequesting } = useRequestGuard((failureText) =>
    showToast(failureText, "error"),
  );
  const modalState = useTrainingModalState();
  // 학습 예약 Modal에서 수정 중인 값, 예약을 눌렀을 때 찾은 사유, 장치 검색어, 닫힌 뒤에도 사라지는 동안 유지
  const [scheduleDraft, setScheduleDraft] = useState<TrainingScheduleDraft | null>(null);
  const [scheduleProblem, setScheduleProblem] = useState<ScheduleProblem | null>(null);
  const [deviceQuery, setDeviceQuery] = useState("");
  // 학습 Job 상세 위에 학습 취소 확인 Dialog를 띄웠는지 여부
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const models = useAsyncResource(fetchAnalysisModels);
  const devices = useAsyncResource(fetchDevices);
  const filterOptions = useAsyncResource(loadFilterOptions);
  const summary = useAsyncResource(loadSummary);
  const jobs = useAsyncResource(loadJobs);
  const scheduleOptions = useAsyncResource(loadScheduleOptions);

  // 학습 Job과 학습 결과 상세는 Modal을 열 때마다 그 대상으로 다시 조회, 열기 전에는 조회하지 않음
  const openedJob = modalState.last.jobDetail ?? null;
  const loadJobDetail = useMemo(
    () =>
      openedJob === null
        ? null
        : (signal: AbortSignal) => fetchTrainingJobDetail(openedJob.job.id, { signal }),
    [openedJob],
  );
  const jobDetail = useAsyncResource(loadJobDetail);
  const openedResult = modalState.last.resultDetail ?? null;
  const loadResultDetail = useMemo(
    () =>
      openedResult === null
        ? null
        : (signal: AbortSignal) => fetchTrainingResultDetail(openedResult.result.id, { signal }),
    [openedResult],
  );
  const resultDetail = useAsyncResource(loadResultDetail);

  // 임계값 관리는 열 때마다 설정 Modal의 선택지와 그 결과의 장치, Model, Segment Profile을 다시 조회, 열기 전에는 조회하지 않음
  const openedThreshold = modalState.last.thresholdConfig ?? null;
  const loadThresholdConfig = useMemo(
    () =>
      openedThreshold === null
        ? null
        : (signal: AbortSignal) => {
            const { deviceCode, modelCode, segment } = openedThreshold.result;
            return Promise.all([
              fetchModelConfigOptions({ signal }),
              fetchModelConfigProfile({ deviceCode, modelCode, segment }, { signal }),
            ]);
          },
    [openedThreshold],
  );
  const thresholdConfig = useAsyncResource(loadThresholdConfig);
  const configEditor = useModelConfigEditor();
  // 연 결과의 설정을 받으면 편집 시작, 같은 범위 Profile이 있으면 불러오고 없으면 결과와 그 Model의 프리셋으로 새로 채움
  if (
    openedThreshold !== null &&
    thresholdConfig.resource.status === "success" &&
    !thresholdConfig.isReloading &&
    configEditor.session?.source !== openedThreshold
  ) {
    const [configOptions, profile] = thresholdConfig.resource.data;
    const { result } = openedThreshold;
    const scope = {
      deviceCode: result.deviceCode,
      modelCode: result.modelCode,
      segment: result.segment,
    };
    configEditor.start({
      source: openedThreshold,
      mode: "threshold",
      configId: profile?.id ?? null,
      origin: {
        ...scope,
        trainedAt: result.trainedAt,
        threshold: result.threshold,
        hasProfile: profile !== null,
      },
      options: configOptions,
      draft:
        profile !== null
          ? createModelConfigDraft(profile)
          : createNewModelConfigDraft(configOptions, scope, modelConfigTexts.defaultName(scope)),
    });
  }

  // 처음 조회 기간과 Page 크기를 받으면 그 기간을 Input에 채우고 결과 조회 시작
  const options = filterOptions.resource.status === "success" ? filterOptions.resource.data : null;
  if (options !== null && resultRequest === null) {
    setDraftPeriod(options.defaultPeriod);
    setResultRequest(
      createResultRequest({
        ...EMPTY_FILTER,
        period: options.defaultPeriod,
        sort: DEFAULT_SORT,
        page: 1,
        pageSize: options.defaultPageSize,
      }),
    );
  }
  const results = useAsyncResource(resultRequest?.load ?? null);

  // 현재 조회의 응답이 Table에 반영되면 그 조회를 취소할 때 돌아갈 대상으로 보관
  if (
    resultRequest !== null &&
    results.resource.status === "success" &&
    !results.isReloading &&
    shownResultRequest !== resultRequest
  ) {
    setShownResultRequest(resultRequest);
  }
  // 검색이 다시 호출한 조회가 모두 끝나면 Loading Overlay를 닫음
  if (
    pendingSearchId !== null &&
    !summary.isReloading &&
    !jobs.isReloading &&
    !results.isReloading
  ) {
    setPendingSearchId(null);
  }
  // 응답이 0.3초 안에 오지 않을 때만 Loading Overlay 표시
  const isOverlayOpen = useDelayedFlag(pendingSearchId, WAIT_FEEDBACK_DELAY_MS);
  // 목록을 0.3초 넘게 다시 받는 동안에만 이전 Card와 Row를 흐리게 표시하고 그 Card와 Row로 Modal을 열지 않음
  const isJobListStale = useWaitFeedback(jobs.isReloading);
  const isResultListStale = useWaitFeedback(results.isReloading);

  // 결과, 요약, 학습 Job을 다시 조회, 진행률도 이때 새로 받음
  const reloadTrainingData = () => {
    results.reload();
    summary.reload();
    jobs.reload();
  };

  const resources = [models, devices, filterOptions, summary, jobs, scheduleOptions, results];
  if (resources.some(({ resource }) => resource.status === "error")) {
    return (
      <p role="alert" className="text-sm text-on-danger-subtle">
        재학습 설정을 불러오지 못했습니다.
      </p>
    );
  }
  if (
    options === null ||
    draftPeriod === null ||
    resultRequest === null ||
    models.resource.status !== "success" ||
    devices.resource.status !== "success" ||
    summary.resource.status !== "success" ||
    jobs.resource.status !== "success" ||
    scheduleOptions.resource.status !== "success" ||
    results.resource.status !== "success"
  ) {
    return <TrainingSkeleton />;
  }
  const trainingScheduleOptions = scheduleOptions.resource.data;
  const resultQuery = resultRequest.query;

  const jobList = jobs.resource.data;
  const { rows, totalCount, pageCount } = results.resource.data;
  // Page 수가 줄어 현재 Page가 없어지면 마지막 Page로 이동해 다시 조회
  const lastPage = Math.max(1, pageCount);
  if (resultQuery.page > lastPage) {
    setResultRequest(createResultRequest({ ...resultQuery, page: lastPage }));
  }
  if (pickedJobId === null && jobList.length > 0) setPickedJobId(jobList[0].id);
  if (pickedResultId === null && rows.length > 0) setPickedResultId(rows[0].id);

  // Loading Overlay를 띄울 수 있는 조회 시작, 결과는 넘긴 조회로 호출하고 요약과 학습 Job도 다시 호출
  const startSearch = (nextRequest: ResultRequest) => {
    searchCountRef.current += 1;
    setPendingSearchId(searchCountRef.current);
    setResultRequest(nextRequest);
    summary.reload();
    jobs.reload();
  };

  // 조건이 그대로여도 검색을 누르면 Input의 조건과 기간으로 첫 Page부터 다시 조회, 정렬과 Page 크기는 그대로 유지
  const applyFilter = () => {
    startSearch(
      createResultRequest({ ...resultQuery, ...draftFilter, period: draftPeriod, page: 1 }),
    );
  };

  // 이미 처음 조건이어도 초기화를 누르면 다시 조회, 정렬과 Page 크기는 그대로 유지
  const resetFilter = () => {
    setDraftFilter(EMPTY_FILTER);
    setDraftPeriod(options.defaultPeriod);
    startSearch(
      createResultRequest({
        ...resultQuery,
        ...EMPTY_FILTER,
        period: options.defaultPeriod,
        page: 1,
      }),
    );
  };

  // 같은 Column을 다시 누르면 정렬 방향을 반전하고 다른 Column은 큰 값부터 정렬, Page 번호는 그대로
  const changeSort = (key: TrainingResultSortKey) => {
    const current = resultQuery.sort;
    const direction = current.key === key && current.direction === "desc" ? "asc" : "desc";
    setResultRequest(createResultRequest({ ...resultQuery, sort: { key, direction } }));
  };

  // Page 크기를 바꾸면 첫 Page부터 다시 조회
  const changePageSize = (nextPageSize: number) => {
    if (nextPageSize === resultQuery.pageSize && resultQuery.page === 1) return;
    setResultRequest(createResultRequest({ ...resultQuery, pageSize: nextPageSize, page: 1 }));
  };

  // 다른 Page를 고르면 같은 조건으로 그 Page를 조회
  const changePage = (nextPage: number) => {
    if (nextPage === resultQuery.page) return;
    setResultRequest(createResultRequest({ ...resultQuery, page: nextPage }));
  };

  // 검색을 취소하고 결과, Page 번호, 요약, 학습 Job은 검색 전 응답으로 되돌림, Input은 바꾼 값 그대로 유지
  const cancelSearch = () => {
    if (pendingSearchId === null) return;
    summary.cancel();
    jobs.cancel();
    results.cancel();
    if (shownResultRequest !== null) setResultRequest(shownResultRequest);
    setPendingSearchId(null);
  };

  // 현재 결과 조회의 조건, 기간, 정렬에 맞는 결과 전부를 받아 CSV 파일로 저장, 받지 못하면 파일 없이 실패 알림 표시
  const exportCsv = async () => {
    if (isRequesting) return;
    const query = {
      modelCode: resultQuery.modelCode,
      deviceCode: resultQuery.deviceCode,
      period: resultQuery.period,
      sort: resultQuery.sort,
    };
    const isDone = await request(async () => {
      const content = await exportTrainingResultsCsv(query);
      saveFile(content, datedFileName(CSV_FILE_BASE_NAME, "csv", new Date()));
    }, trainingToastTexts.exportFailed);
    if (isDone) showToast(trainingToastTexts.exported);
  };

  // 열 때마다 조회로 받은 처음 값으로 채움, 요청 중에 열면 요청이 끝날 때까지 닫히지 않으므로 열지 않음
  const openSchedule = () => {
    if (isRequesting) return;
    setScheduleDraft(createTrainingScheduleDraft(trainingScheduleOptions));
    setScheduleProblem(null);
    setDeviceQuery("");
    modalState.open({ type: "schedule" });
  };

  // 오류를 표시한 Input의 값이 바뀌면 그 오류를 지움, 다른 Input을 바꾸면 그대로 유지
  const changeScheduleDraft = (nextDraft: TrainingScheduleDraft) => {
    if (
      scheduleProblem !== null &&
      scheduleDraft !== null &&
      hasTrainingScheduleFieldChanged(scheduleProblem.field, scheduleDraft, nextDraft)
    ) {
      setScheduleProblem(null);
    }
    setScheduleDraft(nextDraft);
  };

  // 보낼 수 없으면 첫 사유만 표시하고 보낼 수 있으면 예약한 뒤 목록과 KPI를 다시 조회
  const submitSchedule = async () => {
    if (scheduleDraft === null) return;
    const problem = findTrainingScheduleProblem(scheduleDraft);
    if (problem !== null) {
      setScheduleProblem({ reason: problem, field: trainingScheduleProblemField(problem) });
      return;
    }
    const input = toTrainingScheduleInput(scheduleDraft);
    if (input === null) return;
    let scheduledIds: readonly TrainingJobId[] = [];
    const isDone = await request(async () => {
      scheduledIds = await scheduleTraining(input);
    }, trainingToastTexts.scheduleFailed);
    if (!isDone) return;
    modalState.close();
    reloadTrainingData();
    if (scheduledIds.length > 0) showToast(trainingToastTexts.scheduled(scheduledIds[0]));
  };

  const openJob = (job: TrainingJob) => {
    if (isRequesting || isJobListStale) return;
    setPickedJobId(job.id);
    modalState.open({ type: "jobDetail", job });
  };

  const openResult = (result: TrainingResult) => {
    if (isResultListStale) return;
    setPickedResultId(result.id);
    modalState.open({ type: "resultDetail", result });
  };

  // 같은 장치, Model, Segment의 임계값 설정 열기, 요청 중에 열면 닫히지 않으므로 열지 않음
  const openThreshold = (result: TrainingResult) => {
    if (isRequesting || isResultListStale) return;
    setPickedResultId(result.id);
    modalState.open({ type: "thresholdConfig", result });
  };

  // 현재 연 결과의 편집이면 그 Form, 아니면 다시 받는 동안 Loading 중이나 실패 화면
  const thresholdContent: ModelConfigModalContent =
    configEditor.session !== null && configEditor.session.source === openedThreshold
      ? (configEditor.readyContent() ?? { status: "loading" })
      : thresholdConfig.resource.status === "error" && !thresholdConfig.isReloading
        ? { status: "error" }
        : { status: "loading" };

  // 저장을 막는 사유가 없으면 저장하고 닫은 뒤 알림, 결과 Table은 다시 조회하지 않음. 실패하면 Modal을 그대로 두고 실패 알림 표시
  const saveThresholdConfig = async () => {
    const input = configEditor.prepareSave();
    if (input === null) return;
    const isDone = await request(() => saveModelConfig(input), modelConfigToastTexts.saveFailed);
    if (!isDone) return;
    modalState.close();
    showToast(modelConfigToastTexts.saved);
  };

  const jobTarget = openedJob?.job ?? null;
  // 다시 받는 동안에는 이전에 연 Job의 상세를 표시하지 않음, 다른 대상을 연 때부터 그 응답이 올 때까지 다시 받는 중으로 간주
  const jobDetailData =
    jobDetail.resource.status === "success" && !jobDetail.isReloading
      ? jobDetail.resource.data
      : null;
  const isJobDetailFailed = jobDetail.resource.status === "error" && !jobDetail.isReloading;

  // 실패한 Job과 같은 조건으로 새 Job을 만들고 목록과 KPI를 다시 조회한 뒤 새 Job 번호로 알림
  const retryJob = async () => {
    if (jobTarget === null) return;
    const jobId = jobTarget.id;
    let retriedId = null as TrainingJobId | null;
    const isDone = await request(async () => {
      retriedId = await retryTrainingJob(jobId);
    }, trainingToastTexts.retryFailed);
    if (!isDone) return;
    modalState.close();
    reloadTrainingData();
    if (retriedId !== null) showToast(trainingToastTexts.retried(retriedId));
  };

  // 끝나기 전 Job을 취소한 뒤 확인 Dialog와 상세를 닫고 학습 Job과 KPI를 다시 조회, 실패하면 둘 다 그대로 두고 실패 알림 표시
  const cancelJob = async () => {
    if (jobTarget === null) return;
    const jobId = jobTarget.id;
    const isDone = await request(() => cancelTrainingJob(jobId), trainingToastTexts.cancelFailed);
    if (!isDone) return;
    setIsCancelConfirmOpen(false);
    modalState.close();
    summary.reload();
    jobs.reload();
    showToast(trainingToastTexts.canceled(jobId));
  };

  const resultTarget = openedResult?.result ?? null;
  const resultDetailData =
    resultDetail.resource.status === "success" && !resultDetail.isReloading
      ? resultDetail.resource.data
      : null;
  const isResultDetailFailed =
    resultDetail.resource.status === "error" && !resultDetail.isReloading;

  return (
    <>
      <TrainingSettingsTemplate
        filterBar={
          <TrainingFilterBar
            models={models.resource.data}
            devices={devices.resource.data}
            filter={draftFilter}
            onFilterChange={setDraftFilter}
            period={draftPeriod}
            onPeriodChange={setDraftPeriod}
            selectablePeriod={options.selectablePeriod}
            onReset={resetFilter}
            onSearch={applyFilter}
            onOpenSchedule={openSchedule}
            isScheduleDisabled={isRequesting}
          />
        }
        kpiRow={<TrainingKpiRow summary={summary.resource.data} />}
        jobsCard={
          <TrainingJobsCard
            jobs={jobList}
            selectedJobId={pickedJobId}
            onOpenJob={openJob}
            isJobDisabled={isRequesting || isJobListStale}
          />
        }
        resultsCard={
          <TrainingResultsCard
            rows={rows}
            models={models.resource.data}
            totalCount={totalCount}
            sort={resultQuery.sort}
            onSortChange={changeSort}
            pageSize={resultQuery.pageSize}
            pageSizes={options.pageSizes}
            onPageSizeChange={changePageSize}
            onExportCsv={() => void exportCsv()}
            isExportDisabled={isRequesting}
            selectedResultId={pickedResultId}
            onOpenResult={openResult}
            onOpenThreshold={openThreshold}
            isRowDisabled={isResultListStale}
            isThresholdDisabled={isRequesting || isResultListStale}
            onResetFilter={resetFilter}
            page={resultQuery.page}
            pageCount={pageCount}
            onPageChange={changePage}
          />
        }
      />
      {scheduleDraft ? (
        <TrainingScheduleModal
          open={modalState.openType === "schedule"}
          options={trainingScheduleOptions}
          devices={devices.resource.data}
          draft={scheduleDraft}
          onDraftChange={changeScheduleDraft}
          deviceQuery={deviceQuery}
          onDeviceQueryChange={setDeviceQuery}
          problem={scheduleProblem}
          isSubmitting={isRequesting}
          onSubmit={() => void submitSchedule()}
          onClose={unlessRequesting(modalState.close)}
        />
      ) : null}
      <TrainingJobDetailModal
        open={modalState.openType === "jobDetail"}
        job={jobTarget}
        detail={jobDetailData}
        isDetailFailed={isJobDetailFailed}
        isRetrying={isRequesting}
        onRetry={() => void retryJob()}
        isCanceling={isRequesting}
        onCancelJob={unlessRequesting(() => setIsCancelConfirmOpen(true))}
        onClose={unlessRequesting(modalState.close)}
        overlays={
          <TrainingJobCancelConfirmDialog
            open={modalState.openType === "jobDetail" && isCancelConfirmOpen}
            isConfirming={isRequesting}
            onConfirm={() => void cancelJob()}
            onCancel={unlessRequesting(() => setIsCancelConfirmOpen(false))}
          />
        }
      />
      <TrainingResultDetailModal
        open={modalState.openType === "resultDetail"}
        result={resultTarget}
        models={models.resource.data}
        detail={resultDetailData}
        isDetailFailed={isResultDetailFailed}
        isThresholdDisabled={isRequesting || isResultListStale}
        onOpenThreshold={() => {
          if (resultTarget !== null) openThreshold(resultTarget);
        }}
        onClose={modalState.close}
      />
      <ModelConfigModal
        open={modalState.openType === "thresholdConfig"}
        mode="threshold"
        content={thresholdContent}
        devices={devices.resource.data}
        isSaving={isRequesting}
        onDraftChange={configEditor.changeDraft}
        onModelChange={configEditor.changeModel}
        onAddRow={configEditor.addRow}
        onRemoveRow={configEditor.removeRow}
        onParamBlur={configEditor.touchParam}
        onSave={() => void saveThresholdConfig()}
        onRetry={thresholdConfig.reload}
        onClose={unlessRequesting(modalState.close)}
      />
      <SearchingOverlay open={isOverlayOpen} onCancel={cancelSearch} />
    </>
  );
}
