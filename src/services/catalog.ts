import type { Device } from "@/domain/device";
import type { AnalysisModel } from "@/domain/model";
import { ANALYSIS_MODELS, DEVICES } from "@/services/mock/catalogData";

// 모니터링 대상 장치 목록 조회
export async function fetchDevices(): Promise<readonly Device[]> {
  return DEVICES;
}

// 이상 탐지에 사용하는 분석 Model 목록 조회
export async function fetchAnalysisModels(): Promise<readonly AnalysisModel[]> {
  return ANALYSIS_MODELS;
}
