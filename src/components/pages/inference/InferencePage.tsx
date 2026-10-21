"use client";

import { useMemo, useRef, useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import { InferenceDetailModal } from "@/components/organisms/InferenceDetailModal";
import { InferenceFilterBar } from "@/components/organisms/InferenceFilterBar";
import { InferenceJobCancelConfirmDialog } from "@/components/organisms/InferenceJobCancelConfirmDialog";
import { InferenceJobsCard } from "@/components/organisms/InferenceJobsCard";
import { InferenceResultsCard } from "@/components/organisms/InferenceResultsCard";
import { InferenceRunModal } from "@/components/organisms/InferenceRunModal";
import { InferenceSkeleton } from "@/components/organisms/InferenceSkeleton";
import { inferenceToastTexts } from "@/components/organisms/inferenceToastTexts";
import { SearchingOverlay } from "@/components/organisms/SearchingOverlay";
import { useInferenceModalState } from "@/components/pages/inference/inferenceModalState";
import { InferenceTemplate } from "@/components/templates/InferenceTemplate";
import {
  isFailedInferenceJobStatus,
  type InferenceJob,
  type InferenceJobDetail,
  type InferenceJobId,
  type InferenceResult,
  type InferenceResultFilter,
  type InferenceResultId,
  type InferenceResultPage,
  type InferenceResultQuery,
  type InferenceRunDraft,
  type InferenceRunProblem,
  type InferenceRunProblemField,
} from "@/domain/inference";
import {
  createJobRequestDraft,
  findJobRequestProblem,
  hasJobRequestFieldChanged,
  jobRequestProblemField,
  toJobRequestInput,
} from "@/domain/jobRequest";
import type { DateRange } from "@/domain/period";
import { datedFileName, saveFile } from "@/lib/downloadFile";
import { useAsyncResource, type AsyncLoad, type AsyncResource } from "@/lib/useAsyncResource";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import { useRequestGuard } from "@/lib/useRequestGuard";
import { useWaitFeedback } from "@/lib/useWaitFeedback";
import { WAIT_FEEDBACK_DELAY_MS } from "@/lib/waitFeedback";
import { fetchAnalysisModels, fetchDevices } from "@/services/catalog";
import {
  cancelInferenceJob,
  exportInferenceResultsCsv,
  fetchInferenceFilterOptions,
  fetchInferenceJobDetail,
  fetchInferenceJobs,
  fetchInferenceResults,
  fetchInferenceRunOptions,
  retryInferenceJob,
  runInference,
} from "@/services/inference";

const EMPTY_FILTER: InferenceResultFilter = { modelCode: null, deviceCode: null };
// 내려받는 CSV 파일 이름의 앞부분, 뒤에 내려받은 시각을 붙임
const CSV_FILE_BASE_NAME = "inference-results";
// 상세를 다시 받는 동안 Modal에 넘길 상태
const LOADING_DETAIL = { status: "loading" } as const;

// 화면에서 취소할 수 있도록 AbortSignal을 넘기는 조회
const loadFilterOptions = (signal: AbortSignal) => fetchInferenceFilterOptions({ signal });
const loadJobs = (signal: AbortSignal) => fetchInferenceJobs({ signal });
const loadRunOptions = (signal: AbortSignal) => fetchInferenceRunOptions({ signal });

// 추론 실행 Click 시 찾은 사유와 그 사유를 표시할 Input
interface RunProblem {
  reason: InferenceRunProblem;
  field: InferenceRunProblemField;
}

// 결과 조회 1건의 조건, 기간, Page와 그 조건으로 호출하는 조회 함수를 함께 보관(취소하면 앞의 조회를 그대로 되돌려 다시 호출하지 않음)
interface ResultRequest {
  query: InferenceResultQuery;
  load: AsyncLoad<InferenceResultPage>;
}

// 조건, 기간, Page로 결과 조회 1건 생성
function createResultRequest(query: InferenceResultQuery): ResultRequest {
  return { query, load: (signal) => fetchInferenceResults(query, { signal }) };
}

// 검색, 초기화, 기간 변경으로 시작해 Response를 기다리는 조회, 오래 걸리면 Overlay를 띄우고 취소할 수 있음
interface PendingSearch {
  id: number;
  // Job List도 다시 조회한 검색인지 여부, 기간 변경은 결과만 다시 조회
  reloadsJobs: boolean;
}

// 추론 화면에 데이터와 사용자 동작 연결
export function InferencePage() {
  // 추론 Model과 장치 Input의 값, 검색 Click 전에는 반영하지 않음
  const [draftFilter, setDraftFilter] = useState<InferenceResultFilter>(EMPTY_FILTER);
  // 추론일시 Input의 값, 선택하는 즉시 조회하지만 취소하면 Input은 선택한 값 유지, 처음 기간을 받기 전에는 null
  const [draftPeriod, setDraftPeriod] = useState<DateRange | null>(null);
  // 현재 결과 조회에 쓴 조건, 기간, Page, 처음 기간을 받기 전에는 null
  const [resultRequest, setResultRequest] = useState<ResultRequest | null>(null);
  // 결과 Table에 표시 중인 Response의 조회, 검색을 취소하면 이 조회로 되돌림
  const [shownResultRequest, setShownResultRequest] = useState<ResultRequest | null>(null);
  // Overlay를 띄울 수 있는 조회, 없으면 null
  const [pendingSearch, setPendingSearch] = useState<PendingSearch | null>(null);
  const searchCountRef = useRef(0);
  // Job Card에 실패한 Job만 표시할지 여부
  const [failedOnly, setFailedOnly] = useState(false);
  // 마지막으로 연 Job Card와 결과 Row, 연 적이 없으면 처음 받은 List의 첫 항목으로 채움
  const [pickedJobId, setPickedJobId] = useState<InferenceJobId | null>(null);
  const [pickedResultId, setPickedResultId] = useState<InferenceResultId | null>(null);
  // Request 중에는 실행 Button, Modal의 닫기, Request 중 닫기가 막히는 Modal을 여는 Button, Card, Row를 막고 실패하면 Toast 표시
  const { isRequesting, request, unlessRequesting } = useRequestGuard((failureText) =>
    showToast(failureText, "error"),
  );
  const modalState = useInferenceModalState();
  // 추론 실행 Modal에서 편집 중인 값, 실행 Click 시 찾은 사유, 장치 검색어, 닫힌 뒤에도 사라지는 동안 유지
  const [runDraft, setRunDraft] = useState<InferenceRunDraft | null>(null);
  const [runProblem, setRunProblem] = useState<RunProblem | null>(null);
  const [deviceQuery, setDeviceQuery] = useState("");
  // 추론 상세 위에 추론 취소 확인 Dialog를 띄웠는지 여부
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const models = useAsyncResource(fetchAnalysisModels);
  const devices = useAsyncResource(fetchDevices);
  const filterOptions = useAsyncResource(loadFilterOptions);
  const jobs = useAsyncResource(loadJobs);
  const runOptions = useAsyncResource(loadRunOptions);

  // 추론 상세는 Modal을 열 때마다 그 Job으로 다시 조회, 열기 전에는 조회하지 않고 실패는 Modal 안에서만 표시
  const openedDetail = modalState.last.detail ?? null;
  const loadDetail = useMemo(
    () =>
      openedDetail === null
        ? null
        : (signal: AbortSignal) => fetchInferenceJobDetail(openedDetail.jobId, { signal }),
    [openedDetail],
  );
  const detail = useAsyncResource(loadDetail);

  // 처음 조회 기간을 받으면 그 기간을 Input에 채우고 결과 조회 시작
  const options = filterOptions.resource.status === "success" ? filterOptions.resource.data : null;
  if (options !== null && resultRequest === null) {
    setDraftPeriod(options.defaultPeriod);
    setResultRequest(createResultRequest({ ...EMPTY_FILTER, period: options.defaultPeriod, page: 1 }));
  }
  const results = useAsyncResource(resultRequest?.load ?? null);

  // 현재 조회의 Response가 Table에 반영되면 그 조회를 취소할 때 돌아갈 조회로 보관
  if (
    resultRequest !== null &&
    results.resource.status === "success" &&
    !results.isReloading &&
    shownResultRequest !== resultRequest
  ) {
    setShownResultRequest(resultRequest);
  }
  // 검색이 다시 호출한 조회가 모두 끝나면 Overlay를 닫음
  if (pendingSearch !== null && !jobs.isReloading && !results.isReloading) setPendingSearch(null);
  // Response가 0.3초 안에 오지 않을 때만 Overlay 표시
  const isOverlayOpen = useDelayedFlag(pendingSearch?.id ?? null, WAIT_FEEDBACK_DELAY_MS);
  // List를 0.3초 넘게 다시 받는 동안에만 이전 Card와 Row를 옅게 하고 그 Card로 Modal을 열지 않음
  const isJobListStale = useWaitFeedback(jobs.isReloading);
  const isResultListStale = useWaitFeedback(results.isReloading);

  // 결과와 추론 Job을 다시 조회, 진행률도 이때 새로 받음
  const reloadInferenceData = () => {
    results.reload();
    jobs.reload();
  };

  const resources = [models, devices, filterOptions, jobs, runOptions, results];
  if (resources.some(({ resource }) => resource.status === "error")) {
    return (
      <p role="alert" className="text-sm text-on-danger-subtle">
        추론 화면을 불러오지 못했습니다.
      </p>
    );
  }
  if (
    options === null ||
    draftPeriod === null ||
    resultRequest === null ||
    models.resource.status !== "success" ||
    devices.resource.status !== "success" ||
    jobs.resource.status !== "success" ||
    runOptions.resource.status !== "success" ||
    results.resource.status !== "success"
  ) {
    return <InferenceSkeleton />;
  }
  const inferenceRunOptions = runOptions.resource.data;
  const resultQuery = resultRequest.query;

  const { jobs: jobList, recentDays } = jobs.resource.data;
  const { rows, totalCount, pageCount } = results.resource.data;
  // Page 수가 줄어 현재 Page가 없어지면 마지막 Page로 옮겨 다시 조회
  const lastPage = Math.max(1, pageCount);
  if (resultQuery.page > lastPage) {
    setResultRequest(createResultRequest({ ...resultQuery, page: lastPage }));
  }
  if (pickedJobId === null && jobList.length > 0) setPickedJobId(jobList[0].id);
  if (pickedResultId === null && rows.length > 0) setPickedResultId(rows[0].id);
  // Switch에 맞춰 Card로 표시할 Job, 실패만 보면 실패한 Job, 아니면 실패가 아닌 Job
  const shownJobs = jobList.filter(
    (job) => isFailedInferenceJobStatus(job.status) === failedOnly,
  );

  // Overlay를 띄울 수 있는 조회 시작, 결과는 넘긴 조회로, Job List는 reloadsJobs일 때 다시 조회
  const startSearch = (nextRequest: ResultRequest, reloadsJobs: boolean) => {
    searchCountRef.current += 1;
    setPendingSearch({ id: searchCountRef.current, reloadsJobs });
    setResultRequest(nextRequest);
    if (reloadsJobs) jobs.reload();
  };

  // 조건이 그대로여도 검색을 Click하면 Input의 조건과 기간으로 첫 Page부터 다시 조회
  const applyFilter = () => {
    startSearch(createResultRequest({ ...draftFilter, period: draftPeriod, page: 1 }), true);
  };

  // 이미 처음 조건이어도 초기화를 Click하면 다시 조회, Switch와 선택한 Card와 Row는 그대로 유지
  const resetFilter = () => {
    setDraftFilter(EMPTY_FILTER);
    setDraftPeriod(options.defaultPeriod);
    startSearch(
      createResultRequest({ ...EMPTY_FILTER, period: options.defaultPeriod, page: 1 }),
      true,
    );
  };

  // 기간을 선택하면 바로 첫 Page부터 다시 조회, 종료일까지 선택하면 검색처럼 Overlay 표시, 시작일만 선택한 동안은 옅게 하고 Click을 막음
  const changePeriod = (next: DateRange) => {
    setDraftPeriod(next);
    const nextRequest = createResultRequest({ ...resultQuery, period: next, page: 1 });
    if (next.to === null) setResultRequest(nextRequest);
    else startSearch(nextRequest, false);
  };

  // 다른 Page를 선택하면 같은 조건으로 그 Page 조회
  const changePage = (nextPage: number) => {
    if (nextPage === resultQuery.page) return;
    setResultRequest(createResultRequest({ ...resultQuery, page: nextPage }));
  };

  // 검색을 취소하고 결과와 Page 번호를 검색 전 Response로 되돌림, Input은 바꾼 값 그대로 유지
  const cancelSearch = () => {
    if (pendingSearch === null) return;
    if (pendingSearch.reloadsJobs) jobs.cancel();
    results.cancel();
    if (shownResultRequest !== null) setResultRequest(shownResultRequest);
    setPendingSearch(null);
  };

  // 현재 결과 조회의 조건과 기간에 맞는 결과 전부를 받아 CSV 파일로 저장, 받지 못하면 파일 없이 실패 Toast 표시
  const exportCsv = async () => {
    if (isRequesting) return;
    const query = {
      modelCode: resultQuery.modelCode,
      deviceCode: resultQuery.deviceCode,
      period: resultQuery.period,
    };
    const isDone = await request(async () => {
      const content = await exportInferenceResultsCsv(query);
      saveFile(content, datedFileName(CSV_FILE_BASE_NAME, "csv", new Date()));
    }, inferenceToastTexts.exportFailed);
    if (isDone) showToast(inferenceToastTexts.exported);
  };

  // 열 때마다 조회로 받은 처음 값으로 채움, Request 중에 열면 Request가 끝날 때까지 닫히지 않으므로 열지 않음
  const openRun = () => {
    if (isRequesting) return;
    setRunDraft(createJobRequestDraft(inferenceRunOptions));
    setRunProblem(null);
    setDeviceQuery("");
    modalState.open({ type: "run" });
  };

  // 오류를 표시한 Input의 값이 바뀌면 그 오류를 지움, 다른 Input을 바꾸면 그대로 유지
  const changeRunDraft = (nextDraft: InferenceRunDraft) => {
    if (
      runProblem !== null &&
      runDraft !== null &&
      hasJobRequestFieldChanged(runProblem.field, runDraft, nextDraft)
    ) {
      setRunProblem(null);
    }
    setRunDraft(nextDraft);
  };

  // 보낼 수 없으면 첫 사유만 표시하고 보낼 수 있으면 Request 전송 후 Job과 결과를 다시 조회
  const submitRun = async () => {
    if (runDraft === null) return;
    const problem = findJobRequestProblem(runDraft);
    if (problem !== null) {
      setRunProblem({ reason: problem, field: jobRequestProblemField(problem) });
      return;
    }
    const input = toJobRequestInput(runDraft);
    if (input === null) return;
    let requestedIds: readonly InferenceJobId[] = [];
    const isDone = await request(async () => {
      requestedIds = await runInference(input);
    }, inferenceToastTexts.requestFailed);
    if (!isDone) return;
    modalState.close();
    reloadInferenceData();
    if (requestedIds.length > 0) showToast(inferenceToastTexts.requested(requestedIds[0]));
  };

  // 실패한 Job의 상세에는 재시도가 있어 Request 중에는 열지 않음
  const openJob = (job: InferenceJob) => {
    if (isRequesting || isJobListStale) return;
    setPickedJobId(job.id);
    modalState.open({ type: "detail", jobId: job.id });
  };

  // 결과 Row를 만든 Job이 실패했으면 상세에 재시도가 있어 Request 중에는 열지 않음
  const openResult = (result: InferenceResult) => {
    if (isRequesting || isResultListStale) return;
    setPickedResultId(result.id);
    modalState.open({ type: "detail", jobId: result.jobId });
  };

  // 다시 받는 동안에는 이전에 연 Job의 상세를 표시하지 않음, 다른 Job을 연 시점부터 Response가 올 때까지 다시 받는 중으로 처리
  const detailView: AsyncResource<InferenceJobDetail> = detail.isReloading
    ? LOADING_DETAIL
    : detail.resource;
  const detailData = detailView.status === "success" ? detailView.data : null;

  // 실패한 Job과 같은 조건으로 새 Job을 만들고 Job과 결과를 다시 조회한 뒤 새 Job 번호로 Toast 표시
  const retryJob = async () => {
    if (detailData === null) return;
    const jobId = detailData.id;
    let retriedId = null as InferenceJobId | null;
    const isDone = await request(async () => {
      retriedId = await retryInferenceJob(jobId);
    }, inferenceToastTexts.retryFailed);
    if (!isDone) return;
    modalState.close();
    reloadInferenceData();
    if (retriedId !== null) showToast(inferenceToastTexts.retried(retriedId));
  };

  // 끝나기 전 Job을 취소한 뒤 확인 Dialog와 상세를 닫고 Job과 결과를 다시 조회, 실패하면 둘 다 그대로 두고 실패 Toast 표시
  const cancelJob = async () => {
    if (detailData === null) return;
    const jobId = detailData.id;
    const isDone = await request(() => cancelInferenceJob(jobId), inferenceToastTexts.cancelFailed);
    if (!isDone) return;
    setIsCancelConfirmOpen(false);
    modalState.close();
    reloadInferenceData();
    showToast(inferenceToastTexts.canceled(jobId));
  };

  return (
    <>
      <InferenceTemplate
        filterBar={
          <InferenceFilterBar
            models={models.resource.data}
            devices={devices.resource.data}
            filter={draftFilter}
            onFilterChange={setDraftFilter}
            period={draftPeriod}
            onPeriodChange={changePeriod}
            selectablePeriod={options.selectablePeriod}
            onReset={resetFilter}
            onSearch={applyFilter}
            onOpenRun={openRun}
            isRunDisabled={isRequesting}
          />
        }
        jobsCard={
          <InferenceJobsCard
            jobs={shownJobs}
            recentDays={recentDays}
            failedOnly={failedOnly}
            onFailedOnlyChange={setFailedOnly}
            selectedJobId={pickedJobId}
            onOpenJob={openJob}
            isJobDisabled={isRequesting || isJobListStale}
          />
        }
        resultsCard={
          <InferenceResultsCard
            rows={rows}
            models={models.resource.data}
            devices={devices.resource.data}
            totalCount={totalCount}
            levelThresholds={options.levelThresholds}
            onExportCsv={() => void exportCsv()}
            isExportDisabled={isRequesting}
            selectedResultId={pickedResultId}
            onOpenResult={openResult}
            isRowDisabled={isRequesting || isResultListStale}
            page={resultQuery.page}
            pageCount={pageCount}
            onPageChange={changePage}
          />
        }
      />
      {runDraft ? (
        <InferenceRunModal
          open={modalState.openType === "run"}
          options={inferenceRunOptions}
          devices={devices.resource.data}
          draft={runDraft}
          onDraftChange={changeRunDraft}
          deviceQuery={deviceQuery}
          onDeviceQueryChange={setDeviceQuery}
          problem={runProblem}
          isSubmitting={isRequesting}
          onSubmit={() => void submitRun()}
          onClose={unlessRequesting(modalState.close)}
        />
      ) : null}
      <InferenceDetailModal
        open={modalState.openType === "detail"}
        jobId={openedDetail?.jobId ?? null}
        detail={detailView}
        models={models.resource.data}
        isRequesting={isRequesting}
        onReload={detail.reload}
        onRetry={() => void retryJob()}
        onOpenRun={openRun}
        onCancelJob={unlessRequesting(() => setIsCancelConfirmOpen(true))}
        onClose={unlessRequesting(modalState.close)}
        overlays={
          <InferenceJobCancelConfirmDialog
            open={modalState.openType === "detail" && isCancelConfirmOpen}
            isConfirming={isRequesting}
            onConfirm={() => void cancelJob()}
            onCancel={unlessRequesting(() => setIsCancelConfirmOpen(false))}
          />
        }
      />
      <SearchingOverlay open={isOverlayOpen} onCancel={cancelSearch} />
    </>
  );
}
