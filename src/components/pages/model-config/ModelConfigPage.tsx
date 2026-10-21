"use client";

import { useMemo, useRef, useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import { ModelConfigDeleteConfirmDialog } from "@/components/organisms/ModelConfigDeleteConfirmDialog";
import { ModelConfigFilterBar } from "@/components/organisms/ModelConfigFilterBar";
import { ModelConfigListCard } from "@/components/organisms/ModelConfigListCard";
import {
  modelConfigListTexts,
  modelConfigListToastTexts,
} from "@/components/organisms/modelConfigListTexts";
import {
  ModelConfigModal,
  type ModelConfigModalContent,
} from "@/components/organisms/ModelConfigModal";
import { ModelConfigSkeleton } from "@/components/organisms/ModelConfigSkeleton";
import { modelConfigTexts, modelConfigToastTexts } from "@/components/organisms/modelConfigTexts";
import { SearchingOverlay } from "@/components/organisms/SearchingOverlay";
import { useModelConfigModalState } from "@/components/pages/model-config/modelConfigModalState";
import { useModelConfigEditor } from "@/components/pages/model-config/useModelConfigEditor";
import { ModelConfigTemplate } from "@/components/templates/ModelConfigTemplate";
import {
  createModelConfigDraft,
  createNewModelConfigDraft,
  type ModelConfig,
  type ModelConfigFilter,
  type ModelConfigListQuery,
  type ModelConfigPage as ModelConfigListPage,
  type ModelConfigUse,
} from "@/domain/modelConfig";
import { useAsyncResource, type AsyncLoad } from "@/lib/useAsyncResource";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import { useRequestGuard } from "@/lib/useRequestGuard";
import { useWaitFeedback } from "@/lib/useWaitFeedback";
import { WAIT_FEEDBACK_DELAY_MS } from "@/lib/waitFeedback";
import { fetchDevices } from "@/services/catalog";
import {
  changeModelConfigUse,
  deleteModelConfig,
  fetchModelConfigFilterOptions,
  fetchModelConfigOptions,
  fetchModelConfigs,
  saveModelConfig,
} from "@/services/modelConfigs";

const EMPTY_FILTER: ModelConfigFilter = { deviceCode: null, modelCode: null, use: null };

// 화면에서 취소할 수 있도록 AbortSignal을 넘기는 조회
const loadFilterOptions = (signal: AbortSignal) => fetchModelConfigFilterOptions({ signal });

// 목록 조회 1회분, 조건과 Page 및 그 조건으로 호출하는 조회 함수를 짝으로 보관(취소하면 이전 조회를 다시 호출하지 않고 그대로 되돌림)
interface ListRequest {
  query: ModelConfigListQuery;
  load: AsyncLoad<ModelConfigListPage>;
}

// 조건과 Page로 목록 조회 1회분 생성
function createListRequest(query: ModelConfigListQuery): ListRequest {
  return { query, load: (signal) => fetchModelConfigs(query, { signal }) };
}

const FIRST_REQUEST = createListRequest({ ...EMPTY_FILTER, page: 1 });

// 모델 커스텀 Page에 데이터와 사용자 행동 연결
export function ModelConfigPage() {
  // 장치, Model, 사용 여부 Input 값, 검색을 누르기 전에는 반영하지 않음
  const [draftFilter, setDraftFilter] = useState<ModelConfigFilter>(EMPTY_FILTER);
  const [listRequest, setListRequest] = useState<ListRequest>(FIRST_REQUEST);
  // Table에 표시 중인 응답의 조회, 검색을 취소하면 이 조회로 되돌림
  const [shownListRequest, setShownListRequest] = useState<ListRequest | null>(null);
  // Loading Overlay를 띄울 수 있는 검색의 번호, 없으면 null
  const [pendingSearchId, setPendingSearchId] = useState<number | null>(null);
  const searchCountRef = useRef(0);
  // 사용 여부를 바꾼 뒤 목록 상단에 표시할 안내, 바꾼 적이 없으면 null
  const { isRequesting, request, unlessRequesting } = useRequestGuard((failureText) =>
    showToast(failureText, "error"),
  );
  const modalState = useModelConfigModalState();

  const devices = useAsyncResource(fetchDevices);
  const filterOptions = useAsyncResource(loadFilterOptions);
  const list = useAsyncResource(listRequest.load);

  // 설정 Modal은 열 때마다 선택지, 프리셋, 범위를 다시 조회, 열기 전에는 조회하지 않음
  const openedConfig = modalState.last.config ?? null;
  const loadConfigOptions = useMemo(
    () =>
      openedConfig === null
        ? null
        : (signal: AbortSignal) => fetchModelConfigOptions({ signal }),
    [openedConfig],
  );
  const configOptions = useAsyncResource(loadConfigOptions);
  const configEditor = useModelConfigEditor();
  // 연 Modal의 선택지를 받으면 편집 시작, 수정은 해당 Row, 복제는 이름에 복사본을 붙이고 사용 N, 새 설정은 처음 값과 프리셋
  if (
    openedConfig !== null &&
    configOptions.resource.status === "success" &&
    !configOptions.isReloading &&
    configEditor.session?.source !== openedConfig
  ) {
    const options = configOptions.resource.data;
    const { mode, config } = openedConfig;
    configEditor.start({
      source: openedConfig,
      mode,
      configId: mode === "edit" && config !== null ? config.id : null,
      origin: null,
      options,
      draft:
        config === null
          ? createNewModelConfigDraft(options, null, "")
          : mode === "duplicate"
            ? createModelConfigDraft(config, {
                name: modelConfigTexts.duplicateName(config.name),
                use: "N",
              })
            : createModelConfigDraft(config),
    });
  }

  // 현재 조회의 응답이 Table에 반영되면 그 조회를 취소할 때 돌아갈 대상으로 보관
  if (list.resource.status === "success" && !list.isReloading && shownListRequest !== listRequest) {
    setShownListRequest(listRequest);
  }
  // 검색이 다시 호출한 조회가 끝나면 Loading Overlay를 닫음
  if (pendingSearchId !== null && !list.isReloading) setPendingSearchId(null);
  // 응답이 0.3초 안에 오지 않을 때만 Loading Overlay 표시
  const isOverlayOpen = useDelayedFlag(pendingSearchId, WAIT_FEEDBACK_DELAY_MS);
  // 목록을 0.3초 넘게 다시 받는 동안에만 이전 Row를 흐리게 표시하고 그 Row로 Modal을 열지 않음
  const isListStale = useWaitFeedback(list.isReloading);

  const resources = [devices, filterOptions, list];
  if (resources.some(({ resource }) => resource.status === "error")) {
    return (
      <p role="alert" className="text-sm text-on-danger-subtle">
        {modelConfigListTexts.loadFailed}
      </p>
    );
  }
  if (
    devices.resource.status !== "success" ||
    filterOptions.resource.status !== "success" ||
    list.resource.status !== "success"
  ) {
    return <ModelConfigSkeleton />;
  }
  const listQuery = listRequest.query;
  const { rows, totalCount, pageCount } = list.resource.data;
  // Page 수가 줄어 현재 Page가 없어지면 마지막 Page로 이동해 다시 조회
  const lastPage = Math.max(1, pageCount);
  if (listQuery.page > lastPage) {
    setListRequest(createListRequest({ ...listQuery, page: lastPage }));
  }
  const isRowDisabled = isRequesting || isListStale;

  // Loading Overlay를 띄울 수 있는 조회 시작
  const startSearch = (filter: ModelConfigFilter) => {
    searchCountRef.current += 1;
    setPendingSearchId(searchCountRef.current);
    setListRequest(createListRequest({ ...filter, page: 1 }));
  };

  // 조건이 그대로여도 검색을 누르면 Input의 조건으로 첫 Page부터 다시 조회
  const applyFilter = () => startSearch(draftFilter);

  // 이미 처음 조건이어도 초기화를 누르면 다시 조회
  const resetFilter = () => {
    setDraftFilter(EMPTY_FILTER);
    startSearch(EMPTY_FILTER);
  };

  const changePage = (nextPage: number) => {
    if (nextPage === listQuery.page) return;
    setListRequest(createListRequest({ ...listQuery, page: nextPage }));
  };

  // 검색을 취소하고 Table과 Page 번호는 검색 전 응답으로 되돌림, Input은 바꾼 값 그대로 유지
  const cancelSearch = () => {
    if (pendingSearchId === null) return;
    list.cancel();
    if (shownListRequest !== null) setListRequest(shownListRequest);
    setPendingSearchId(null);
  };

  // Request 중이나 목록을 다시 받는 동안에는 Row에서 Modal을 열지 않음
  const openConfig = (mode: "edit" | "new" | "duplicate", config: ModelConfig | null) => {
    if (isRequesting || (config !== null && isListStale)) return;
    modalState.open({ type: "config", mode, config });
  };

  const openDelete = (config: ModelConfig) => {
    if (isRowDisabled) return;
    modalState.open({ type: "delete", config });
  };

  // 현재 연 Modal이 편집이면 그 Form, 아니면 다시 받는 동안 Loading 중이나 실패 화면
  const configContent: ModelConfigModalContent =
    configEditor.session !== null && configEditor.session.source === openedConfig
      ? (configEditor.readyContent() ?? { status: "loading" })
      : configOptions.resource.status === "error" && !configOptions.isReloading
        ? { status: "error" }
        : { status: "loading" };

  // 저장을 막는 사유가 없으면 저장하고 닫은 뒤 목록 재조회, 실패하면 Modal을 그대로 두고 실패 알림 표시
  const saveConfig = async () => {
    const input = configEditor.prepareSave();
    if (input === null) return;
    const isDone = await request(() => saveModelConfig(input), modelConfigToastTexts.saveFailed);
    if (!isDone) return;
    modalState.close();
    list.reload();
    showToast(modelConfigToastTexts.saved);
  };

  const deleteTarget = modalState.last.delete?.config ?? null;
  // 삭제한 뒤 확인 Dialog를 닫고 목록 재조회, 실패하면 Dialog를 그대로 두고 실패 알림 표시
  const confirmDelete = async () => {
    if (deleteTarget === null) return;
    const isDone = await request(
      () => deleteModelConfig(deleteTarget.id),
      modelConfigListToastTexts.deleteFailed,
    );
    if (!isDone) return;
    modalState.close();
    list.reload();
    showToast(modelConfigListToastTexts.deleted);
  };

  // 사용 여부를 바꾼 뒤 목록 상단에 안내를 표시하고 목록 재조회
  const changeUse = async (config: ModelConfig, use: ModelConfigUse) => {
    if (isRowDisabled) return;
    const isDone = await request(async () => {
      const change = await changeModelConfigUse(config.id, use);
      showToast(modelConfigListToastTexts.useChanged(config.name, use, change));
    }, modelConfigListToastTexts.useChangeFailed);
    if (isDone) list.reload();
  };

  return (
    <>
      <ModelConfigTemplate
        filterBar={
          <ModelConfigFilterBar
            devices={devices.resource.data}
            options={filterOptions.resource.data}
            filter={draftFilter}
            onFilterChange={setDraftFilter}
            onReset={resetFilter}
            onSearch={applyFilter}
            onOpenNew={() => openConfig("new", null)}
            isNewDisabled={isRequesting}
          />
        }
        listCard={
          <ModelConfigListCard
            rows={rows}
            totalCount={totalCount}
            onEdit={(config) => openConfig("edit", config)}
            onDuplicate={(config) => openConfig("duplicate", config)}
            onDelete={openDelete}
            onUseChange={(config, use) => void changeUse(config, use)}
            isRowDisabled={isRowDisabled}
            onResetFilter={resetFilter}
            page={listQuery.page}
            pageCount={pageCount}
            onPageChange={changePage}
          />
        }
      />
      <ModelConfigModal
        open={modalState.openType === "config"}
        mode={openedConfig?.mode ?? "new"}
        content={configContent}
        devices={devices.resource.data}
        isSaving={isRequesting}
        onDraftChange={configEditor.changeDraft}
        onModelChange={configEditor.changeModel}
        onAddRow={configEditor.addRow}
        onRemoveRow={configEditor.removeRow}
        onParamBlur={configEditor.touchParam}
        onSave={() => void saveConfig()}
        onRetry={configOptions.reload}
        onClose={unlessRequesting(modalState.close)}
      />
      <ModelConfigDeleteConfirmDialog
        open={modalState.openType === "delete"}
        config={deleteTarget}
        isConfirming={isRequesting}
        onConfirm={() => void confirmDelete()}
        onCancel={unlessRequesting(modalState.close)}
      />
      <SearchingOverlay open={isOverlayOpen} onCancel={cancelSearch} />
    </>
  );
}
