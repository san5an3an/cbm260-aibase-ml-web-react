"use client";

import { useMemo, useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import { AlarmCreateModal } from "@/components/organisms/AlarmCreateModal";
import { alarmToastTexts } from "@/components/organisms/alarmToastTexts";
import { EnsembleDetailModal } from "@/components/organisms/EnsembleDetailModal";
import { EnsembleFilterBar } from "@/components/organisms/EnsembleFilterBar";
import { EnsembleJobCancelConfirmDialog } from "@/components/organisms/EnsembleJobCancelConfirmDialog";
import { EnsembleJobsCard } from "@/components/organisms/EnsembleJobsCard";
import { EnsembleRunModal } from "@/components/organisms/EnsembleRunModal";
import { EnsembleSkeleton } from "@/components/organisms/EnsembleSkeleton";
import { ensembleAlarmComment, ensembleToastTexts } from "@/components/organisms/ensembleTexts";
import { EnsembleVerdictCard } from "@/components/organisms/EnsembleVerdictCard";
import { EnsembleTemplate } from "@/components/templates/EnsembleTemplate";
import {
  createAlarmDraft,
  findInvalidAlarmCreateFields,
  toAlarmCreateInput,
  type AlarmCreateDraft,
} from "@/domain/alarms";
import type {
  EnsembleJob,
  EnsembleJobId,
  EnsembleRunDraft,
  EnsembleRunProblem,
  EnsembleRunProblemField,
} from "@/domain/ensemble";
import {
  createJobRequestDraft,
  findJobRequestProblem,
  hasJobRequestFieldChanged,
  jobRequestProblemField,
  toJobRequestInput,
} from "@/domain/jobRequest";
import { datedFileName, saveFile } from "@/lib/downloadFile";
import { formatIsoDateTime } from "@/lib/formatTime";
import { useAsyncResource } from "@/lib/useAsyncResource";
import { useRequestGuard } from "@/lib/useRequestGuard";
import { useWaitFeedback } from "@/lib/useWaitFeedback";
import { createAlarm, fetchAlarmCreateOptions } from "@/services/alarms";
import { fetchAnalysisModels, fetchDevices } from "@/services/catalog";
import {
  cancelEnsembleJob,
  exportEnsembleJobCsv,
  fetchEnsembleJobDetail,
  fetchEnsembleJobs,
  fetchEnsembleRunOptions,
  retryEnsembleJob,
  runEnsemble,
} from "@/services/ensemble";

// 내려받는 CSV 파일 이름의 앞부분, 뒤에 내려받은 시각을 붙임
const CSV_FILE_BASE_NAME = "ensemble-verdict";
// Alarm 등록에 미리 채울 이상 비율의 소수 자릿수, 판정 Card와 같음
const ALARM_RATE_DIGITS = 1;

// 화면에서 취소할 수 있도록 AbortSignal을 넘기는 조회, 실행 선택지가 화면에 반영된 것을 먼저 알림
const loadRunOptions = (signal: AbortSignal) => fetchEnsembleRunOptions({ signal });
const loadJobs = (signal: AbortSignal) => fetchEnsembleJobs({ signal });
const loadAlarmCreateOptions = (signal: AbortSignal) => fetchAlarmCreateOptions({ signal });

// 이 화면에서 바로 뜨는 Modal, Ensemble 실행, Ensemble 상세, 판정에서 여는 Alarm 등록
type EnsembleModal = "run" | "detail" | "alarm";

// Ensemble 실행 Click 시 찾은 사유와 그 사유를 표시할 Input
interface RunProblem {
  reason: EnsembleRunProblem;
  field: EnsembleRunProblemField;
}

// 모델 비교 화면에 데이터와 사용자 동작 연결
export function EnsemblePage() {
  // 마지막으로 선택한 Job, 선택한 적이 없거나 List에서 사라지면 List의 첫 Job
  const [pickedJobId, setPickedJobId] = useState<EnsembleJobId | null>(null);
  const [openModal, setOpenModal] = useState<EnsembleModal | null>(null);
  // Request 중에는 실행 Button, Card, 재시도와 Modal의 닫기를 막고 실패하면 Toast 표시
  const { isRequesting, request, unlessRequesting } = useRequestGuard((failureText) =>
    showToast(failureText, "error"),
  );
  // Ensemble 실행 Modal에서 편집 중인 값, 찾은 사유, 장치 검색어, 닫힌 뒤에도 사라지는 동안 유지
  const [runDraft, setRunDraft] = useState<EnsembleRunDraft | null>(null);
  const [runProblem, setRunProblem] = useState<RunProblem | null>(null);
  const [deviceQuery, setDeviceQuery] = useState("");
  // Alarm 등록 Form과 등록 Click 후 확인 여부
  const [alarmDraft, setAlarmDraft] = useState<AlarmCreateDraft | null>(null);
  const [hasTriedAlarm, setHasTriedAlarm] = useState(false);
  // Ensemble 상세 위에 취소 확인 Dialog를 띄웠는지 여부
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const models = useAsyncResource(fetchAnalysisModels);
  const devices = useAsyncResource(fetchDevices);
  const runOptions = useAsyncResource(loadRunOptions);
  const jobs = useAsyncResource(loadJobs);
  const alarmOptions = useAsyncResource(loadAlarmCreateOptions);

  // 선택한 Job, 선택한 Job이 List에 없으면 첫 Job, List가 비면 null
  const jobList = jobs.resource.status === "success" ? jobs.resource.data : null;
  const pickedJob =
    jobList === null ? null : (jobList.find((job) => job.id === pickedJobId) ?? jobList[0] ?? null);
  const shownJobId = pickedJob?.id ?? null;

  // 선택한 Job의 상세는 판정 Card와 상세 Modal이 함께 사용, 실패는 해당 Card와 Modal 안에서만 표시
  const loadDetail = useMemo(
    () => (shownJobId === null ? null : (signal: AbortSignal) => fetchEnsembleJobDetail(shownJobId, { signal })),
    [shownJobId],
  );
  const detail = useAsyncResource(loadDetail);
  // List를 0.3초 넘게 다시 받는 동안에만 이전 Card를 옅게 하고 그 Card로 Modal을 열지 않음
  const isJobListStale = useWaitFeedback(jobs.isReloading);

  const resources = [models, devices, runOptions, jobs, alarmOptions];
  if (resources.some(({ resource }) => resource.status === "error")) {
    return (
      <p role="alert" className="text-sm text-on-danger-subtle">
        모델 비교 화면을 불러오지 못했습니다.
      </p>
    );
  }
  if (
    jobList === null ||
    models.resource.status !== "success" ||
    devices.resource.status !== "success" ||
    runOptions.resource.status !== "success" ||
    alarmOptions.resource.status !== "success"
  ) {
    return <EnsembleSkeleton />;
  }
  const ensembleRunOptions = runOptions.resource.data;
  const alarmCreateOptions = alarmOptions.resource.data;
  // 다시 받는 동안에는 이전에 선택한 Job의 상세를 표시하지 않음
  const detailData = !detail.isReloading && detail.resource.status === "success" ? detail.resource.data : null;
  const isDetailFailed = !detail.isReloading && detail.resource.status === "error";

  // 열 때마다 조회로 받은 처음 값으로 채움, Request 중에는 열지 않음
  const openRun = () => {
    if (isRequesting) return;
    setRunDraft(createJobRequestDraft(ensembleRunOptions));
    setRunProblem(null);
    setDeviceQuery("");
    setOpenModal("run");
  };

  // 오류를 표시한 Input의 값이 바뀌면 그 오류를 지움, 다른 Input을 바꾸면 그대로 유지
  const changeRunDraft = (nextDraft: EnsembleRunDraft) => {
    if (runProblem !== null && runDraft !== null && hasJobRequestFieldChanged(runProblem.field, runDraft, nextDraft)) {
      setRunProblem(null);
    }
    setRunDraft(nextDraft);
  };

  // 보낼 수 없으면 첫 사유만 표시하고 보낼 수 있으면 Request 전송 후 Job List를 다시 조회
  const submitRun = async () => {
    if (runDraft === null) return;
    const problem = findJobRequestProblem(runDraft);
    if (problem !== null) {
      setRunProblem({ reason: problem, field: jobRequestProblemField(problem) });
      return;
    }
    const input = toJobRequestInput(runDraft);
    if (input === null) return;
    let requestedIds: readonly EnsembleJobId[] = [];
    const isDone = await request(async () => {
      requestedIds = await runEnsemble(input);
    }, ensembleToastTexts.requestFailed);
    if (!isDone) return;
    setOpenModal(null);
    jobs.reload();
    if (requestedIds.length > 0) showToast(ensembleToastTexts.requested(requestedIds[0]));
  };

  // Card를 Click하면 그 Job을 선택하고 상세를 엶, 실패와 진행 중 상세에는 실행 Button이 있어 Request 중에는 열지 않음
  const openJob = (job: EnsembleJob) => {
    if (isRequesting || isJobListStale) return;
    // 상세를 받지 못한 Job을 다시 Click하면 그 상세를 다시 조회
    if (job.id === shownJobId && isDetailFailed) detail.reload();
    setPickedJobId(job.id);
    setOpenModal("detail");
  };

  // 실패한 Job과 같은 조건으로 새 Job을 만들고 Job List를 다시 조회한 뒤 새 Job 번호로 Toast 표시
  const retryJob = async (jobId: EnsembleJobId) => {
    if (isRequesting) return;
    let retriedId = null as EnsembleJobId | null;
    const isDone = await request(async () => {
      retriedId = await retryEnsembleJob(jobId);
    }, ensembleToastTexts.retryFailed);
    if (!isDone) return;
    setOpenModal(null);
    jobs.reload();
    if (retriedId !== null) showToast(ensembleToastTexts.retried(retriedId));
  };

  // 끝나기 전 Job을 취소한 뒤 확인 Dialog와 상세를 닫고 Job List를 다시 조회, 실패하면 둘 다 그대로 두고 실패 Toast 표시
  const cancelJob = async () => {
    if (detailData === null) return;
    const jobId = detailData.id;
    const isDone = await request(() => cancelEnsembleJob(jobId), ensembleToastTexts.cancelFailed);
    if (!isDone) return;
    setIsCancelConfirmOpen(false);
    setOpenModal(null);
    jobs.reload();
    showToast(ensembleToastTexts.canceled(jobId));
  };

  // 연 Job의 판정을 받아 CSV 파일로 저장, 받지 못하면 파일 없이 실패 Toast 표시
  const exportCsv = async () => {
    if (isRequesting || detailData === null) return;
    const jobId = detailData.id;
    const isDone = await request(async () => {
      const content = await exportEnsembleJobCsv(jobId);
      saveFile(content, datedFileName(CSV_FILE_BASE_NAME, "csv", new Date()));
    }, ensembleToastTexts.exportFailed);
    if (isDone) showToast(ensembleToastTexts.exported);
  };

  // 판정의 장치, 편성, 모든 Model 일치 비율, 생성 시각을 채운 Alarm 등록을 상세 대신 엶
  const openAlarm = () => {
    if (isRequesting || detailData?.status !== "succeeded") return;
    const allVerdict = detailData.verdict.consensus.find((item) => item.rule === "all");
    setAlarmDraft({
      ...createAlarmDraft(alarmCreateOptions),
      deviceCode: detailData.deviceCode,
      modelCode: detailData.alarmDefaults.modelCode,
      segment: detailData.segment,
      formation: detailData.formation ?? "",
      severity: detailData.alarmDefaults.severity,
      anomalyRatePercent: allVerdict === undefined ? "" : allVerdict.anomalyRatePercent.toFixed(ALARM_RATE_DIGITS),
      occurredAt: formatIsoDateTime(detailData.createdAt),
      comment: ensembleAlarmComment(detailData.id),
    });
    setHasTriedAlarm(false);
    setOpenModal("alarm");
  };

  const activeAlarmDraft = alarmDraft ?? createAlarmDraft(alarmCreateOptions);
  const invalidAlarmFields = hasTriedAlarm ? findInvalidAlarmCreateFields(activeAlarmDraft, alarmCreateOptions) : [];

  // 고쳐야 할 Input이 있으면 표시만 하고 없으면 Alarm을 등록한 뒤 닫고 Toast 표시
  const submitAlarm = async () => {
    if (findInvalidAlarmCreateFields(activeAlarmDraft, alarmCreateOptions).length > 0) {
      setHasTriedAlarm(true);
      return;
    }
    const isDone = await request(
      () => createAlarm(toAlarmCreateInput(activeAlarmDraft, alarmCreateOptions)),
      alarmToastTexts.createFailed,
    );
    if (!isDone) return;
    setOpenModal(null);
    showToast(alarmToastTexts.created);
  };

  return (
    <>
      <EnsembleTemplate
        filterBar={<EnsembleFilterBar onOpenRun={openRun} isRunDisabled={isRequesting} />}
        jobsCard={
          <EnsembleJobsCard
            jobs={jobList}
            selectedJobId={shownJobId}
            onOpenJob={openJob}
            onRetryJob={(job) => void retryJob(job.id)}
            isJobDisabled={isRequesting || isJobListStale}
            className="flex-1"
          />
        }
        verdictCard={
          <EnsembleVerdictCard
            detail={detailData}
            isDetailFailed={isDetailFailed}
            hasNoJob={pickedJob === null}
            analysisModels={models.resource.data}
            className="flex-1"
          />
        }
      />
      {runDraft ? (
        <EnsembleRunModal
          open={openModal === "run"}
          options={ensembleRunOptions}
          devices={devices.resource.data}
          draft={runDraft}
          onDraftChange={changeRunDraft}
          deviceQuery={deviceQuery}
          onDeviceQueryChange={setDeviceQuery}
          problem={runProblem}
          isSubmitting={isRequesting}
          onSubmit={() => void submitRun()}
          onClose={unlessRequesting(() => setOpenModal(null))}
        />
      ) : null}
      <EnsembleDetailModal
        open={openModal === "detail"}
        job={pickedJob}
        detail={detailData}
        isDetailFailed={isDetailFailed}
        analysisModels={models.resource.data}
        isRequesting={isRequesting}
        onExportCsv={() => void exportCsv()}
        onOpenAlarm={openAlarm}
        onRetry={() => (detailData === null ? undefined : void retryJob(detailData.id))}
        onCancelJob={unlessRequesting(() => setIsCancelConfirmOpen(true))}
        onClose={unlessRequesting(() => setOpenModal(null))}
        overlays={
          <EnsembleJobCancelConfirmDialog
            open={openModal === "detail" && isCancelConfirmOpen}
            isConfirming={isRequesting}
            onConfirm={() => void cancelJob()}
            onCancel={unlessRequesting(() => setIsCancelConfirmOpen(false))}
          />
        }
      />
      <AlarmCreateModal
        open={openModal === "alarm"}
        devices={devices.resource.data}
        models={models.resource.data}
        options={alarmCreateOptions}
        draft={activeAlarmDraft}
        onDraftChange={setAlarmDraft}
        invalidFields={invalidAlarmFields}
        isSubmitting={isRequesting}
        onSubmit={() => void submitAlarm()}
        onClose={unlessRequesting(() => setOpenModal(null))}
      />
    </>
  );
}
