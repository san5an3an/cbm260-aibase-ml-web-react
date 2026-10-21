"use client";

import { useRef, useState } from "react";
import { DailyAnomalyTrendCard } from "@/components/organisms/DailyAnomalyTrendCard";
import { DailyDetailCard } from "@/components/organisms/DailyDetailCard";
import { SearchingOverlay } from "@/components/organisms/SearchingOverlay";
import { TimelineFilterBar } from "@/components/organisms/TimelineFilterBar";
import { TimelineSkeleton } from "@/components/organisms/TimelineSkeleton";
import { AnomalyTimelineTemplate } from "@/components/templates/AnomalyTimelineTemplate";
import type { AnomalyTimeline, AnomalyTimelineQuery } from "@/domain/timeline";
import { useAsyncResource, type AsyncLoad } from "@/lib/useAsyncResource";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import { WAIT_FEEDBACK_DELAY_MS } from "@/lib/waitFeedback";
import { fetchAnalysisModels, fetchDevices } from "@/services/catalog";
import { fetchAnomalyTimeline, fetchAnomalyTimelineOptions } from "@/services/timeline";

// 일자별 상세 한 Page에 표시할 Row 수
const ROWS_PER_PAGE = 5;

// 화면에서 취소할 수 있도록 AbortSignal을 넘기는 조회
const loadOptions = (signal: AbortSignal) => fetchAnomalyTimelineOptions({ signal });

interface DraftFilter {
  deviceCode: string | null;
  modelCode: string | null;
  // 선택하기 전에는 조회한 처음 값 사용
  days: number | null;
}

const EMPTY_DRAFT: DraftFilter = { deviceCode: null, modelCode: null, days: null };

// 이상 추이 조회 1회분, 적용된 조건과 그 조건으로 호출하는 조회 함수를 짝으로 보관(취소하면 이전 조회를 다시 호출하지 않고 그대로 되돌림)
interface TimelineRequest {
  query: AnomalyTimelineQuery;
  load: AsyncLoad<AnomalyTimeline>;
}

// Input의 조건으로 이상 추이 조회 1회분 생성, 기간을 고르지 않았으면 처음 기간으로 조회
function createTimelineRequest(filter: DraftFilter, defaultDays: number): TimelineRequest {
  const query: AnomalyTimelineQuery = {
    deviceCode: filter.deviceCode,
    modelCode: filter.modelCode,
    days: filter.days ?? defaultDays,
  };
  return { query, load: (signal) => fetchAnomalyTimeline(query, { signal }) };
}

// 조회나 초기화로 시작해 응답을 기다리는 조회, 오래 걸리면 Loading Overlay를 띄우고 취소할 수 있음
interface PendingSearch {
  id: number;
  // 응답이 오면 선택한 날짜도 비울지 여부, 조회는 Page만 첫 Page로 이동하고 초기화는 선택한 날짜도 비움
  clearsPickedDate: boolean;
}

// 이상 타임라인 화면에 데이터와 사용자 행동 연결
export function AnomalyTimelinePage() {
  // 장치, Model, 기간 Input 값, 조회를 누르기 전에는 반영하지 않고 취소해도 선택한 값 그대로 유지
  const [draft, setDraft] = useState<DraftFilter>(EMPTY_DRAFT);
  // 현재 이상 추이 조회에 사용한 조건, 처음 기간을 받기 전에는 null
  const [timelineRequest, setTimelineRequest] = useState<TimelineRequest | null>(null);
  // Chart와 Table에 표시 중인 응답의 조회, 조회를 취소하면 이 조회로 되돌림
  const [shownTimelineRequest, setShownTimelineRequest] = useState<TimelineRequest | null>(null);
  // Loading Overlay를 띄울 수 있는 조회, 없으면 null
  const [pendingSearch, setPendingSearch] = useState<PendingSearch | null>(null);
  const searchCountRef = useRef(0);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedPage, setPickedPage] = useState(1);

  const devices = useAsyncResource(fetchDevices);
  const models = useAsyncResource(fetchAnalysisModels);
  const options = useAsyncResource(loadOptions);

  const optionsData = options.resource.status === "success" ? options.resource.data : null;
  const defaultDays = optionsData?.defaultDayCount ?? null;

  // 처음 기간을 받으면 처음 조건으로 이상 추이 조회 시작
  if (defaultDays !== null && timelineRequest === null) {
    setTimelineRequest(createTimelineRequest(EMPTY_DRAFT, defaultDays));
  }
  const timeline = useAsyncResource(timelineRequest?.load ?? null);

  // 현재 조회의 응답이 Chart와 Table에 반영되면 그 조회를 취소할 때 돌아갈 대상으로 보관
  if (
    timelineRequest !== null &&
    timeline.resource.status === "success" &&
    !timeline.isReloading &&
    shownTimelineRequest !== timelineRequest
  ) {
    setShownTimelineRequest(timelineRequest);
  }
  // 응답이 오면 Loading Overlay를 닫고 첫 Page로 이동, 초기화였으면 선택한 날짜도 비움. 취소하면 누르기 전 상태 유지
  if (pendingSearch !== null && !timeline.isReloading) {
    setPendingSearch(null);
    setPickedPage(1);
    if (pendingSearch.clearsPickedDate) setPickedDate(null);
  }
  // 응답이 0.3초 안에 오지 않을 때만 Loading Overlay 표시
  const isOverlayOpen = useDelayedFlag(pendingSearch?.id ?? null, WAIT_FEEDBACK_DELAY_MS);

  if (
    devices.resource.status === "error" ||
    models.resource.status === "error" ||
    options.resource.status === "error" ||
    timeline.resource.status === "error"
  ) {
    return (
      <p role="alert" className="text-sm text-on-danger-subtle">
        이상 타임라인을 불러오지 못했습니다.
      </p>
    );
  }
  if (
    devices.resource.status === "loading" ||
    models.resource.status === "loading" ||
    optionsData === null ||
    defaultDays === null ||
    timeline.resource.status === "loading"
  ) {
    return <TimelineSkeleton />;
  }

  const { points, levelThresholds, days, defaultSelectedDate } = timeline.resource.data;
  const dates = points.map((point) => point.date);
  const fallbackDate =
    defaultSelectedDate !== null && dates.includes(defaultSelectedDate)
      ? defaultSelectedDate
      : (dates[dates.length - 1] ?? null);
  const selectedDate = pickedDate !== null && dates.includes(pickedDate) ? pickedDate : fallbackDate;

  // Table은 최근 날짜부터 표시
  const recentFirst = [...points].reverse();
  const pageCount = Math.max(1, Math.ceil(recentFirst.length / ROWS_PER_PAGE));
  const page = Math.min(pickedPage, pageCount);
  const rows = recentFirst.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  // Chart에서 선택한 날짜가 Table에 보이도록 그 날짜가 있는 Page로 이동
  const selectFromChart = (date: string) => {
    setPickedDate(date);
    const position = recentFirst.findIndex((point) => point.date === date);
    if (position >= 0) setPickedPage(Math.floor(position / ROWS_PER_PAGE) + 1);
  };

  // Loading Overlay를 띄울 수 있는 조회 시작, 이전 조회를 기다리는 중이면 그 조회가 비우려던 선택 날짜도 비움
  const startSearch = (filter: DraftFilter, clearsPickedDate: boolean) => {
    searchCountRef.current += 1;
    setPendingSearch({
      id: searchCountRef.current,
      clearsPickedDate: clearsPickedDate || pendingSearch?.clearsPickedDate === true,
    });
    setTimelineRequest(createTimelineRequest(filter, defaultDays));
  };

  // 조건이 그대로여도 조회를 누르면 Input의 조건으로 다시 조회
  const applyFilter = () => startSearch(draft, false);

  // 이미 처음 조건이어도 초기화를 누르면 다시 조회
  const resetFilter = () => {
    setDraft(EMPTY_DRAFT);
    startSearch(EMPTY_DRAFT, true);
  };

  // 조회를 취소하고 Chart, Table, 선택한 날짜, Page 번호는 누르기 전 응답 그대로 유지, Input은 바꾼 값 그대로 유지
  const cancelSearch = () => {
    if (pendingSearch === null) return;
    timeline.cancel();
    if (shownTimelineRequest !== null) setTimelineRequest(shownTimelineRequest);
    setPendingSearch(null);
  };

  return (
    <>
      <AnomalyTimelineTemplate
        filterBar={
          <TimelineFilterBar
            devices={devices.resource.data}
            deviceCode={draft.deviceCode}
            onDeviceChange={(deviceCode) => setDraft((current) => ({ ...current, deviceCode }))}
            models={models.resource.data}
            modelCode={draft.modelCode}
            onModelChange={(modelCode) => setDraft((current) => ({ ...current, modelCode }))}
            dayCounts={optionsData.dayCounts}
            days={draft.days ?? defaultDays}
            onDaysChange={(nextDays) => setDraft((current) => ({ ...current, days: nextDays }))}
            onReset={resetFilter}
            onQuery={applyFilter}
          />
        }
        trendCard={
          <DailyAnomalyTrendCard
            points={points}
            levelThresholds={levelThresholds}
            selectedDate={selectedDate}
            onSelectDate={selectFromChart}
          />
        }
        detailCard={
          <DailyDetailCard
            rows={rows}
            days={days}
            selectedDate={selectedDate}
            onSelectDate={setPickedDate}
            page={page}
            pageCount={pageCount}
            onPageChange={setPickedPage}
          />
        }
      />
      <SearchingOverlay open={isOverlayOpen} onCancel={cancelSearch} />
    </>
  );
}
