"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/molecules/Toast";
import { AlarmAssigneeModal } from "@/components/organisms/AlarmAssigneeModal";
import { AlarmCarRankingCard } from "@/components/organisms/AlarmCarRankingCard";
import { AlarmCreateModal } from "@/components/organisms/AlarmCreateModal";
import { AlarmDeleteConfirmDialog } from "@/components/organisms/AlarmDeleteConfirmDialog";
import { AlarmEventsSkeleton } from "@/components/organisms/AlarmEventsSkeleton";
import { AlarmFilterBar } from "@/components/organisms/AlarmFilterBar";
import { AlarmKpiRow } from "@/components/organisms/AlarmKpiRow";
import {
  AlarmProcessModal,
  type AlarmProcessDraft,
} from "@/components/organisms/AlarmProcessModal";
import { AlarmRuleDeleteConfirmDialog } from "@/components/organisms/AlarmRuleDeleteConfirmDialog";
import { AlarmRuleEditModal } from "@/components/organisms/AlarmRuleEditModal";
import {
  AlarmRulesModal,
  type AlarmRuleScope,
  type AlarmRulesNotice,
} from "@/components/organisms/AlarmRulesModal";
import { alarmToastTexts } from "@/components/organisms/alarmToastTexts";
import { AlarmTrendCard } from "@/components/organisms/AlarmTrendCard";
import { AlarmWorklistCard } from "@/components/organisms/AlarmWorklistCard";
import { SearchingOverlay } from "@/components/organisms/SearchingOverlay";
import { createAlarmRuleEditorState } from "@/components/pages/alarms/alarmModalState";
import type {
  AlarmModalType,
  AlarmRuleEditorState,
} from "@/components/pages/alarms/alarmModalState";
import { AlarmEventsTemplate } from "@/components/templates/AlarmEventsTemplate";
import { screenPath } from "@/config/navigation";
import {
  buildAlarmRuleMatrix,
  checkAlarmRuleDraft,
  createAlarmDraft,
  findAlarmRule,
  findInvalidAlarmCreateFields,
  isClosedAlarmStatus,
  recordsAcknowledgedAt,
  toAlarmCreateInput,
  toAlarmRuleInput,
} from "@/domain/alarms";
import type {
  Alarm,
  AlarmCreateDraft,
  AlarmFilter,
  AlarmId,
  AlarmSort,
  AlarmSortKey,
  AlarmWorklist,
  AlarmWorklistQuery,
} from "@/domain/alarms";
import { useAsyncResource, type AsyncLoad } from "@/lib/useAsyncResource";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import { useRequestGuard } from "@/lib/useRequestGuard";
import { useWaitFeedback } from "@/lib/useWaitFeedback";
import { WAIT_FEEDBACK_DELAY_MS } from "@/lib/waitFeedback";
import {
  acknowledgeAlarms,
  assignAlarms,
  createAlarm,
  deleteAlarm,
  deleteAlarmRule,
  fetchAlarmAssignees,
  fetchAlarmCarRanking,
  fetchAlarmCreateOptions,
  fetchAlarmFilterOptions,
  fetchAlarmRules,
  fetchAlarmSummary,
  fetchAlarmTrend,
  fetchAlarmWorklist,
  processAlarm,
  saveAlarmRule,
} from "@/services/alarms";
import { fetchAnalysisModels, fetchDevices } from "@/services/catalog";

const ANOMALY_SCREEN_PATH = screenPath("anomaly");
const EMPTY_FILTER: AlarmFilter = { status: null, severity: null, deviceCode: null };
// 처음에는 최근에 발생한 Alarm부터 나열
const DEFAULT_SORT: AlarmSort = { key: "occurredAt", direction: "desc" };
const NO_SELECTION: ReadonlySet<AlarmId> = new Set();
const EMPTY_PROCESS_DRAFT: AlarmProcessDraft = { status: "NEW", assignee: "", comment: "" };
// 새로 만드는 규칙은 켠 상태로 시작
const NEW_RULE_IS_ENABLED = true;
// 처음 Alarm List 조회 조건, 전체 조건, 최신순, 첫 Page
const INITIAL_WORKLIST_QUERY: AlarmWorklistQuery = { ...EMPTY_FILTER, sort: DEFAULT_SORT, page: 1 };

// 화면에서 취소할 수 있도록 AbortSignal을 넘기는 조회
const loadFilterOptions = (signal: AbortSignal) => fetchAlarmFilterOptions({ signal });
const loadCreateOptions = (signal: AbortSignal) => fetchAlarmCreateOptions({ signal });
const loadAssignees = (signal: AbortSignal) => fetchAlarmAssignees({ signal });
const loadRules = (signal: AbortSignal) => fetchAlarmRules({ signal });
const loadSummary = (signal: AbortSignal) => fetchAlarmSummary({ signal });
const loadTrend = (signal: AbortSignal) => fetchAlarmTrend({ signal });
const loadCarRanking = (signal: AbortSignal) => fetchAlarmCarRanking({ signal });

// Alarm List 조회 1건의 조건, 정렬, Page와 그 조건으로 호출하는 조회 함수를 함께 보관(취소하면 앞의 조회를 그대로 되돌려 다시 호출하지 않음)
interface WorklistRequest {
  query: AlarmWorklistQuery;
  load: AsyncLoad<AlarmWorklist>;
}

// 조건, 정렬, Page로 Alarm List 조회 1건 생성
function createWorklistRequest(query: AlarmWorklistQuery): WorklistRequest {
  return { query, load: (signal) => fetchAlarmWorklist(query, { signal }) };
}

// 검색이나 초기화로 시작해 Response를 기다리는 조회, 오래 걸리면 Overlay를 띄우고 취소할 수 있음
interface PendingSearch {
  id: number;
  // Response가 오면 선택한 Row를 비울지 여부, 검색은 비우고 초기화는 그대로 둠
  clearsSelection: boolean;
}

// 알람/이벤트 화면에 데이터와 사용자 동작 연결
export function AlarmEventsPage() {
  const router = useRouter();
  // 상태, 심각도, 장치 Input의 값, 검색 Click 전에는 반영하지 않고 취소해도 선택한 값 유지
  const [draftFilter, setDraftFilter] = useState<AlarmFilter>(EMPTY_FILTER);
  // 현재 Alarm List 조회에 쓴 조건, 정렬, Page
  const [worklistRequest, setWorklistRequest] = useState<WorklistRequest>(() =>
    createWorklistRequest(INITIAL_WORKLIST_QUERY),
  );
  // List Table에 표시 중인 Response의 조회, 검색을 취소하면 이 조회로 되돌림, 첫 Response 전에는 null
  const [shownWorklistRequest, setShownWorklistRequest] = useState<WorklistRequest | null>(null);
  // Overlay를 띄울 수 있는 조회, 없으면 null
  const [pendingSearch, setPendingSearch] = useState<PendingSearch | null>(null);
  const searchCountRef = useRef(0);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<AlarmId>>(NO_SELECTION);
  // 현재 열린 Modal, 닫힌 뒤에도 사라지는 동안 내용이 보이도록 대상과 Input 값은 따로 보관
  const [openModal, setOpenModal] = useState<AlarmModalType | null>(null);
  // Request 중에는 실행 Button과 Modal의 닫기, 삭제를 막고 실패하면 Toast 표시
  const { isRequesting, request, unlessRequesting } = useRequestGuard((failureText) =>
    showToast(failureText, "error"),
  );
  const [targetAlarm, setTargetAlarm] = useState<Alarm | null>(null);
  const [createDraft, setCreateDraft] = useState<AlarmCreateDraft | null>(null);
  const [hasTriedCreate, setHasTriedCreate] = useState(false);
  const [processDraft, setProcessDraft] = useState<AlarmProcessDraft>(EMPTY_PROCESS_DRAFT);
  const [isProcessDeleteOpen, setIsProcessDeleteOpen] = useState(false);
  const [assignTargets, setAssignTargets] = useState<readonly Alarm[]>([]);
  const [assignee, setAssignee] = useState<string | null>(null);
  const [assignComment, setAssignComment] = useState("");
  const [hasTriedAssign, setHasTriedAssign] = useState(false);
  const [onlyDeviceRules, setOnlyDeviceRules] = useState(false);
  const [rulesNotice, setRulesNotice] = useState<AlarmRulesNotice | null>(null);
  const [ruleEditor, setRuleEditor] = useState<AlarmRuleEditorState | null>(null);
  const [isRuleEditorOpen, setIsRuleEditorOpen] = useState(false);
  const [isRuleDeleteOpen, setIsRuleDeleteOpen] = useState(false);

  const devices = useAsyncResource(fetchDevices);
  const models = useAsyncResource(fetchAnalysisModels);
  const filterOptions = useAsyncResource(loadFilterOptions);
  const createOptions = useAsyncResource(loadCreateOptions);
  const assignees = useAsyncResource(loadAssignees);
  const rules = useAsyncResource(loadRules);
  const summary = useAsyncResource(loadSummary);
  const trend = useAsyncResource(loadTrend);
  const carRanking = useAsyncResource(loadCarRanking);
  const worklist = useAsyncResource(worklistRequest.load);

  // 현재 조회의 Response가 Table에 반영되면 그 조회를 취소할 때 돌아갈 조회로 보관
  if (
    worklist.resource.status === "success" &&
    !worklist.isReloading &&
    shownWorklistRequest !== worklistRequest
  ) {
    setShownWorklistRequest(worklistRequest);
  }
  // 검색이 다시 호출한 조회가 모두 끝나면 Overlay를 닫고 검색이었으면 선택한 Row를 비움
  const isSearchReloading =
    worklist.isReloading || summary.isReloading || trend.isReloading || carRanking.isReloading;
  if (pendingSearch !== null && !isSearchReloading) {
    setPendingSearch(null);
    if (pendingSearch.clearsSelection) setSelectedIds(NO_SELECTION);
  }
  // Response가 0.3초 안에 오지 않을 때만 Overlay 표시
  const isOverlayOpen = useDelayedFlag(pendingSearch?.id ?? null, WAIT_FEEDBACK_DELAY_MS);
  // Card마다 자기 데이터를 0.3초 넘게 기다리는 동안 내용을 옅게 하고 Click을 막음, 자기 Response가 오면 따로 해제
  const isWorklistStale = useWaitFeedback(worklist.isReloading);
  const isSummaryStale = useWaitFeedback(summary.isReloading);
  const isTrendStale = useWaitFeedback(trend.isReloading);
  const isCarRankingStale = useWaitFeedback(carRanking.isReloading);

  // Alarm List를 바꾼 뒤 List, 요약, 추이, 순위를 다시 조회
  const reloadAlarmData = () => {
    worklist.reload();
    summary.reload();
    trend.reload();
    carRanking.reload();
  };

  const resources = [
    devices,
    models,
    filterOptions,
    createOptions,
    assignees,
    rules,
    summary,
    trend,
    carRanking,
    worklist,
  ];
  if (resources.some(({ resource }) => resource.status === "error")) {
    return (
      <p role="alert" className="text-sm text-on-danger-subtle">
        알람/이벤트를 불러오지 못했습니다.
      </p>
    );
  }
  if (
    devices.resource.status !== "success" ||
    models.resource.status !== "success" ||
    filterOptions.resource.status !== "success" ||
    createOptions.resource.status !== "success" ||
    assignees.resource.status !== "success" ||
    rules.resource.status !== "success" ||
    summary.resource.status !== "success" ||
    trend.resource.status !== "success" ||
    carRanking.resource.status !== "success" ||
    worklist.resource.status !== "success"
  ) {
    return <AlarmEventsSkeleton />;
  }

  const worklistQuery = worklistRequest.query;
  const { rows, pageSize, pageCount } = worklist.resource.data;
  // Page 수가 줄어 현재 Page가 없어지면 마지막 Page로 옮겨 다시 조회
  const lastPage = Math.max(1, pageCount);
  if (worklistQuery.page > lastPage) {
    setWorklistRequest(createWorklistRequest({ ...worklistQuery, page: lastPage }));
  }
  // 일괄 확인과 담당자 지정의 대상을 현재 표시된 Row 중 선택한 Alarm으로 한정
  const selectedRows = rows.filter((row) => selectedIds.has(row.id));
  const deviceList = devices.resource.data;
  const modelList = models.resource.data;
  const alarmCreateOptions = createOptions.resource.data;
  const ruleList = rules.resource.data;

  // Overlay를 띄울 수 있는 조회 시작, List는 넘긴 조회로, 요약, 추이, 순위는 다시 호출
  const startSearch = (nextRequest: WorklistRequest, clearsSelection: boolean) => {
    searchCountRef.current += 1;
    setPendingSearch({ id: searchCountRef.current, clearsSelection });
    setWorklistRequest(nextRequest);
    summary.reload();
    trend.reload();
    carRanking.reload();
  };

  // 조건이 그대로여도 검색을 Click하면 Input의 조건으로 첫 Page부터 다시 조회, Response가 오면 선택한 Row를 비움
  const applyFilter = () => {
    startSearch(
      createWorklistRequest({ ...draftFilter, sort: worklistQuery.sort, page: 1 }),
      true,
    );
  };

  // 이미 전체 조건이어도 초기화를 Click하면 첫 Page부터 다시 조회, 정렬과 선택한 Row는 그대로 유지
  const resetFilter = () => {
    setDraftFilter(EMPTY_FILTER);
    startSearch(
      createWorklistRequest({ ...EMPTY_FILTER, sort: worklistQuery.sort, page: 1 }),
      false,
    );
  };

  // 검색을 취소하고 결과와 Page 번호를 검색 전 Response로 되돌림, Input은 바꾼 값 그대로 유지
  const cancelSearch = () => {
    if (pendingSearch === null) return;
    worklist.cancel();
    summary.cancel();
    trend.cancel();
    carRanking.cancel();
    if (shownWorklistRequest !== null) setWorklistRequest(shownWorklistRequest);
    setPendingSearch(null);
  };

  // 같은 Column을 다시 Click하면 방향을 뒤집고 다른 Column은 큰 값부터 Sort
  const changeSort = (key: AlarmSortKey) => {
    const { sort } = worklistQuery;
    const nextSort: AlarmSort = {
      key,
      direction: sort.key === key && sort.direction === "desc" ? "asc" : "desc",
    };
    setWorklistRequest(createWorklistRequest({ ...worklistQuery, sort: nextSort }));
  };

  // 다른 Page를 선택하면 같은 조건과 정렬로 그 Page 조회
  const changePage = (nextPage: number) => {
    if (nextPage === worklistQuery.page) return;
    setWorklistRequest(createWorklistRequest({ ...worklistQuery, page: nextPage }));
  };

  const toggleRow = (alarmId: AlarmId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(alarmId)) next.add(alarmId);
      return next;
    });
  };

  // 표시된 Row가 전부 선택돼 있으면 선택을 비우고 아니면 표시된 Row 전부 선택
  const toggleAllRows = () => {
    const isAllSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
    setSelectedIds(isAllSelected ? NO_SELECTION : new Set(rows.map((row) => row.id)));
  };

  const acknowledgeSelected = async () => {
    if (isRequesting || isWorklistStale) return;
    const alarmIds = selectedRows.map((row) => row.id);
    const isDone = await request(
      () => acknowledgeAlarms(alarmIds),
      alarmToastTexts.acknowledgeFailed,
    );
    if (!isDone) return;
    setSelectedIds(NO_SELECTION);
    reloadAlarmData();
    showToast(alarmToastTexts.acknowledged(alarmIds.length));
  };

  const openCreate = () => {
    setCreateDraft(createAlarmDraft(alarmCreateOptions));
    setHasTriedCreate(false);
    setOpenModal("create");
  };

  const activeCreateDraft = createDraft ?? createAlarmDraft(alarmCreateOptions);
  const invalidCreateFields = hasTriedCreate
    ? findInvalidAlarmCreateFields(activeCreateDraft, alarmCreateOptions)
    : [];

  // 고쳐야 할 Input이 있으면 표시만 하고 없으면 등록한 뒤 첫 Page로 이동
  const submitCreate = async () => {
    if (findInvalidAlarmCreateFields(activeCreateDraft, alarmCreateOptions).length > 0) {
      setHasTriedCreate(true);
      return;
    }
    const isDone = await request(
      () => createAlarm(toAlarmCreateInput(activeCreateDraft, alarmCreateOptions)),
      alarmToastTexts.createFailed,
    );
    if (!isDone) return;
    setOpenModal(null);
    setHasTriedCreate(false);
    setWorklistRequest((current) => createWorklistRequest({ ...current.query, page: 1 }));
    reloadAlarmData();
    showToast(alarmToastTexts.created);
  };

  // List를 다시 조회하는 동안에는 이전 Row로 Modal을 열지 않음
  const openProcess = (alarm: Alarm) => {
    if (isWorklistStale) return;
    setTargetAlarm(alarm);
    setProcessDraft({
      status: alarm.status,
      assignee: alarm.assignee ?? "",
      comment: alarm.comment,
    });
    setIsProcessDeleteOpen(false);
    setOpenModal("process");
  };

  // Modal이 열려 있는 동안 List가 바뀌면 바뀐 Alarm을 표시
  const shownTargetAlarm =
    (targetAlarm && rows.find((row) => row.id === targetAlarm.id)) ?? targetAlarm;

  const submitProcess = async () => {
    if (!targetAlarm) return;
    const isDone = await request(
      () =>
        processAlarm(targetAlarm.id, {
          status: processDraft.status,
          assignee: processDraft.assignee.trim() || null,
          comment: processDraft.comment,
        }),
      alarmToastTexts.processFailed,
    );
    if (!isDone) return;
    setOpenModal(null);
    reloadAlarmData();
    showToast(alarmToastTexts.processed);
  };

  const openDelete = (alarm: Alarm) => {
    if (isWorklistStale) return;
    setTargetAlarm(alarm);
    setOpenModal("delete");
  };

  // 삭제한 Alarm을 선택에서 빼고 열려 있던 확인과 처리 Modal을 닫음
  const confirmDelete = async () => {
    if (!targetAlarm) return;
    const alarmId = targetAlarm.id;
    const isDone = await request(() => deleteAlarm(alarmId), alarmToastTexts.deleteFailed);
    if (!isDone) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(alarmId);
      return next;
    });
    setIsProcessDeleteOpen(false);
    setOpenModal(null);
    reloadAlarmData();
    showToast(alarmToastTexts.deleted);
  };

  const openAssign = () => {
    if (isWorklistStale) return;
    setAssignTargets(selectedRows);
    setAssignee(null);
    setAssignComment("");
    setHasTriedAssign(false);
    setOpenModal("assign");
  };

  // Modal이 열린 뒤 List에서 빠진 Alarm은 열 때의 값으로 계속 표시
  const shownAssignTargets = assignTargets.map(
    (target) => rows.find((row) => row.id === target.id) ?? target,
  );

  const submitAssign = async () => {
    if (assignee === null) {
      setHasTriedAssign(true);
      return;
    }
    const alarmIds = assignTargets.map((target) => target.id);
    const isDone = await request(
      () => assignAlarms(alarmIds, { assignee, comment: assignComment.trim() || null }),
      alarmToastTexts.assignFailed,
    );
    if (!isDone) return;
    setOpenModal(null);
    setSelectedIds(NO_SELECTION);
    reloadAlarmData();
    showToast(alarmToastTexts.assigned(alarmIds.length));
  };

  const openRules = () => {
    setRulesNotice(null);
    setIsRuleEditorOpen(false);
    setIsRuleDeleteOpen(false);
    setOpenModal("rules");
  };

  // 해당 범위에 규칙이 있으면 수정으로, 없으면 현재 적용되는 규칙의 값을 채운 추가로 열기
  const openRuleEditor = (scope: AlarmRuleScope) => {
    // 규칙을 다시 조회하는 동안에는 이전 List로 열지 않음
    if (rules.isReloading) return;
    setRuleEditor(createAlarmRuleEditorState(ruleList, scope, NEW_RULE_IS_ENABLED));
    setIsRuleDeleteOpen(false);
    setIsRuleEditorOpen(true);
  };

  const ruleCheck = ruleEditor ? checkAlarmRuleDraft(ruleEditor.draft) : null;
  const hasRuleError =
    ruleCheck !== null && ruleCheck.emptyFields.length + ruleCheck.negativeFields.length > 0;

  const submitRule = async () => {
    if (!ruleEditor) return;
    if (hasRuleError) {
      setRuleEditor({ ...ruleEditor, hasTried: true });
      return;
    }
    // 저장하는 시점에 Form의 범위와 정확히 같은 규칙이 덮어쓸 대상, 없으면 새 규칙으로 저장
    const { draft } = ruleEditor;
    const overwritten = findAlarmRule(ruleList, draft.deviceCode, draft.modelCode);
    const isDone = await request(
      () => saveAlarmRule(overwritten?.id ?? null, toAlarmRuleInput(draft)),
      alarmToastTexts.ruleSaveFailed,
    );
    if (!isDone) return;
    setIsRuleEditorOpen(false);
    setRulesNotice("saved");
    rules.reload();
  };

  const confirmRuleDelete = async () => {
    const ruleId = ruleEditor?.ruleId;
    if (!ruleId) return;
    const isDone = await request(() => deleteAlarmRule(ruleId), alarmToastTexts.ruleDeleteFailed);
    if (!isDone) return;
    setIsRuleDeleteOpen(false);
    setIsRuleEditorOpen(false);
    setRulesNotice("deleted");
    rules.reload();
  };

  const showsRuleErrors = ruleEditor !== null && ruleEditor.hasTried && ruleCheck !== null;

  return (
    <>
      <AlarmEventsTemplate
        filterBar={
          <AlarmFilterBar
            statuses={filterOptions.resource.data.statuses}
            severities={filterOptions.resource.data.severities}
            devices={deviceList}
            filter={draftFilter}
            onFilterChange={setDraftFilter}
            onReset={resetFilter}
            onSearch={applyFilter}
            onOpenRules={openRules}
            onOpenCreate={openCreate}
          />
        }
        kpiRow={<AlarmKpiRow summary={summary.resource.data} isWaiting={isSummaryStale} />}
        worklistCard={
          <AlarmWorklistCard
            rows={rows}
            pageSize={pageSize}
            sort={worklistQuery.sort}
            onSortChange={changeSort}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onToggleAll={toggleAllRows}
            onAcknowledgeSelected={() => void acknowledgeSelected()}
            onAssignSelected={openAssign}
            isBulkActionDisabled={isRequesting || isWorklistStale}
            isRowDisabled={isWorklistStale}
            onProcess={openProcess}
            onDelete={openDelete}
            onResetFilter={resetFilter}
            page={worklistQuery.page}
            pageCount={pageCount}
            onPageChange={changePage}
          />
        }
        trendCard={<AlarmTrendCard trend={trend.resource.data} isWaiting={isTrendStale} />}
        carRankingCard={
          <AlarmCarRankingCard
            rows={carRanking.resource.data}
            isRowDisabled={isCarRankingStale}
            onSelectRow={() => {
              // 순위를 다시 조회하는 동안에는 이전 Row로 이동하지 않음
              if (isCarRankingStale) return;
              router.push(ANOMALY_SCREEN_PATH);
            }}
          />
        }
      />
      <AlarmCreateModal
        open={openModal === "create"}
        devices={deviceList}
        models={modelList}
        options={alarmCreateOptions}
        draft={activeCreateDraft}
        onDraftChange={setCreateDraft}
        invalidFields={invalidCreateFields}
        isSubmitting={isRequesting}
        onSubmit={() => void submitCreate()}
        onClose={unlessRequesting(() => setOpenModal(null))}
      />
      <AlarmProcessModal
        open={openModal === "process"}
        alarm={shownTargetAlarm}
        draft={processDraft}
        onDraftChange={setProcessDraft}
        willRecordAcknowledgedAt={recordsAcknowledgedAt(processDraft.status)}
        willRecordResolvedAt={isClosedAlarmStatus(processDraft.status)}
        isSubmitting={isRequesting}
        onSubmit={() => void submitProcess()}
        onDelete={unlessRequesting(() => setIsProcessDeleteOpen(true))}
        onClose={unlessRequesting(() => setOpenModal(null))}
        overlays={
          <AlarmDeleteConfirmDialog
            open={openModal === "process" && isProcessDeleteOpen}
            alarm={shownTargetAlarm}
            isConfirming={isRequesting}
            onConfirm={() => void confirmDelete()}
            onCancel={unlessRequesting(() => setIsProcessDeleteOpen(false))}
          />
        }
      />
      <AlarmDeleteConfirmDialog
        open={openModal === "delete"}
        alarm={shownTargetAlarm}
        isConfirming={isRequesting}
        onConfirm={() => void confirmDelete()}
        onCancel={unlessRequesting(() => setOpenModal(null))}
      />
      <AlarmAssigneeModal
        open={openModal === "assign"}
        alarms={shownAssignTargets}
        assignees={assignees.resource.data}
        assignee={assignee}
        onAssigneeChange={setAssignee}
        comment={assignComment}
        onCommentChange={setAssignComment}
        showAssigneeError={hasTriedAssign && assignee === null}
        isSubmitting={isRequesting}
        onSubmit={() => void submitAssign()}
        onClose={unlessRequesting(() => setOpenModal(null))}
      />
      <AlarmRulesModal
        open={openModal === "rules"}
        matrix={buildAlarmRuleMatrix(
          ruleList,
          deviceList.map((device) => device.code),
          modelList.map((model) => model.code),
        )}
        devices={deviceList}
        onlyDeviceRules={onlyDeviceRules}
        onOnlyDeviceRulesChange={setOnlyDeviceRules}
        notice={rulesNotice}
        isReloading={rules.isReloading}
        onEditRule={openRuleEditor}
        onClose={unlessRequesting(() => setOpenModal(null))}
        overlays={
          ruleEditor ? (
            <AlarmRuleEditModal
              open={openModal === "rules" && isRuleEditorOpen}
              mode={ruleEditor.mode}
              draft={ruleEditor.draft}
              onDraftChange={(draft) => setRuleEditor({ ...ruleEditor, draft })}
              devices={deviceList}
              models={modelList}
              prefilledScope={ruleEditor.prefilledScope}
              error={
                showsRuleErrors
                  ? ruleCheck.emptyFields.length > 0
                    ? "empty"
                    : ruleCheck.negativeFields.length > 0
                      ? "negative"
                      : null
                  : null
              }
              invalidFields={
                showsRuleErrors ? [...ruleCheck.emptyFields, ...ruleCheck.negativeFields] : []
              }
              isSubmitting={isRequesting}
              onSubmit={() => void submitRule()}
              onDelete={unlessRequesting(() => setIsRuleDeleteOpen(true))}
              onClose={unlessRequesting(() => setIsRuleEditorOpen(false))}
              overlays={
                <AlarmRuleDeleteConfirmDialog
                  open={isRuleEditorOpen && isRuleDeleteOpen}
                  isConfirming={isRequesting}
                  onConfirm={() => void confirmRuleDelete()}
                  onCancel={unlessRequesting(() => setIsRuleDeleteOpen(false))}
                />
              }
            />
          ) : null
        }
      />
      <SearchingOverlay open={isOverlayOpen} onCancel={cancelSearch} />
    </>
  );
}
