import type { Device } from "@/domain/device";
import type { AnalysisModel } from "@/domain/model";

export const DEVICES: readonly Device[] = [
  { code: "ATC", name: "차상신호장치" },
  { code: "AXLE_BEARING", name: "차축 베어링" },
  { code: "BMS", name: "축전지" },
  { code: "CMSB", name: "주공기 압축기" },
  { code: "DCU", name: "출입문장치" },
  { code: "DRIVING_GEAR", name: "드라이빙 기어" },
  { code: "ECU", name: "제동장치" },
  { code: "ENCD", name: "엔코더" },
  { code: "ESW", name: "이더넷스위치" },
  { code: "FRU", name: "화재감지장치" },
  { code: "IDBC", name: "배전반" },
  { code: "MASCON", name: "주간제어기" },
  { code: "MICOM_AIRPURIFIER", name: "공기질개선장치" },
  { code: "MICOM_COOLER", name: "냉방장치" },
  { code: "PAC", name: "방송장치" },
  { code: "PISC", name: "표시기장치" },
  { code: "SIV", name: "보조전원장치" },
  { code: "TCMS", name: "열차 종합 제어 장치" },
  { code: "TRACTION_MOTOR", name: "견인 전동기" },
  { code: "UNVR", name: "무정전장치" },
  { code: "VVVF", name: "추진제어장치" },
];

export const ANALYSIS_MODELS: readonly AnalysisModel[] = [
  { code: "IF", name: "Isolation Forest" },
  { code: "SVM", name: "One-Class SVM" },
  { code: "VAE", name: "Tabular VAE" },
  { code: "PCA", name: "PCA Reconstruction" },
];
