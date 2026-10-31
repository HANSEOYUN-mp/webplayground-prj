"use client";

export type MacroCategory = "minsky" | "fred" | "compare" | "lei";

export interface TrackedDataEntry {
  key: string;
  category: MacroCategory;
  latestVersion: string; // 예: "2026-10", "2026-10-30"
  previousVersion?: string; // 직전에 확인했던 버전 (예: "2026-09")
  detectedAt?: number; // 새 버전이 처음 감지된 시각 (ms)
  dismissed?: boolean; // 사용자가 NEW 배지를 클릭해 확인 처리했는지 여부
}

const STORAGE_KEY = "wp_macro_data_versions_v1";
const NEW_BADGE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 새 데이터 감지 후 7일간 NEW 유지
const EVENT_NAME = "wp-macro-data-updated";

function readStore(): Record<string, TrackedDataEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, TrackedDataEntry>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore storage errors
  }
}

export interface NewStatusResult {
  isNew: boolean;
  latestVersion: string;
  previousVersion?: string;
  detectedAt?: number;
}

/**
 * 특정 지표(key)의 최신 데이터 기준일(latestVersion)을 기록하고,
 * 기존에 저장된 기준일보다 새로운 데이터가 들어왔는지 판별합니다.
 * 예: 기존 "2026-09" -> 새로 "2026-10" 유입 시 isNew = true 반환
 */
export function reportAndCheckNewData(
  key: string,
  category: MacroCategory,
  latestVersion: string | undefined | null
): NewStatusResult {
  if (!latestVersion || typeof window === "undefined") {
    return { isNew: false, latestVersion: latestVersion || "" };
  }

  const normalized = String(latestVersion).trim();
  if (!normalized || normalized === "-") {
    return { isNew: false, latestVersion: normalized };
  }

  const store = readStore();
  const existing = store[key];
  const now = Date.now();

  // 1) 최초 기록인 경우: 현재 최신 데이터 버전을 기준점으로 저장
  if (!existing) {
    store[key] = {
      key,
      category,
      latestVersion: normalized,
    };
    writeStore(store);
    return { isNew: false, latestVersion: normalized };
  }

  // 2) 기존에 보던 버전(예: 2026-09)과 다른 새 버전(예: 2026-10)이 들어온 경우!
  if (existing.latestVersion !== normalized && normalized > existing.latestVersion) {
    const updated: TrackedDataEntry = {
      key,
      category,
      latestVersion: normalized,
      previousVersion: existing.latestVersion,
      detectedAt: now,
      dismissed: false,
    };
    store[key] = updated;
    writeStore(store);
    return {
      isNew: true,
      latestVersion: normalized,
      previousVersion: updated.previousVersion,
      detectedAt: now,
    };
  }

  // 3) 이미 새 버전으로 감지된 상태이며 아직 7일(TTL) 이내이고 닫지 않은 경우
  if (
    existing.detectedAt &&
    !existing.dismissed &&
    now - existing.detectedAt < NEW_BADGE_TTL_MS
  ) {
    return {
      isNew: true,
      latestVersion: existing.latestVersion,
      previousVersion: existing.previousVersion,
      detectedAt: existing.detectedAt,
    };
  }

  return {
    isNew: false,
    latestVersion: existing.latestVersion,
    previousVersion: existing.previousVersion,
    detectedAt: existing.detectedAt,
  };
}

/**
 * 여러 지표(keys)를 한 번에 등록 및 체크하고 결과를 맵으로 반환합니다.
 */
export function reportMultipleNewData(
  items: { key: string; category: MacroCategory; latestVersion?: string | null }[]
): Record<string, NewStatusResult> {
  const result: Record<string, NewStatusResult> = {};
  if (typeof window === "undefined") return result;

  const store = readStore();
  const now = Date.now();
  let changed = false;

  for (const item of items) {
    const normalized = String(item.latestVersion || "").trim();
    if (!normalized || normalized === "-") {
      result[item.key] = { isNew: false, latestVersion: normalized };
      continue;
    }

    const existing = store[item.key];
    if (!existing) {
      store[item.key] = {
        key: item.key,
        category: item.category,
        latestVersion: normalized,
      };
      changed = true;
      result[item.key] = { isNew: false, latestVersion: normalized };
    } else if (
      existing.latestVersion !== normalized &&
      normalized > existing.latestVersion
    ) {
      store[item.key] = {
        key: item.key,
        category: item.category,
        latestVersion: normalized,
        previousVersion: existing.latestVersion,
        detectedAt: now,
        dismissed: false,
      };
      changed = true;
      result[item.key] = {
        isNew: true,
        latestVersion: normalized,
        previousVersion: existing.latestVersion,
        detectedAt: now,
      };
    } else {
      const isStillNew =
        Boolean(existing.detectedAt) &&
        !existing.dismissed &&
        now - (existing.detectedAt || 0) < NEW_BADGE_TTL_MS;
      result[item.key] = {
        isNew: isStillNew,
        latestVersion: existing.latestVersion,
        previousVersion: existing.previousVersion,
        detectedAt: existing.detectedAt,
      };
    }
  }

  if (changed) {
    writeStore(store);
  }

  return result;
}

/**
 * 특정 지표의 NEW 배지를 클릭해 확인(읽음) 처리할 때 호출
 */
export function dismissNewBadge(key: string) {
  if (typeof window === "undefined") return;
  const store = readStore();
  if (store[key]) {
    store[key].dismissed = true;
    writeStore(store);
  }
}

/**
 * 특정 카테고리(minsky, fred, compare, lei) 전체 또는 개별 카테고리에
 * 현재 활성화된 NEW 데이터가 있는지 여부를 반환합니다.
 */
export function getCategoryNewStatus(): Record<MacroCategory, boolean> {
  const status: Record<MacroCategory, boolean> = {
    minsky: false,
    fred: false,
    compare: false,
    lei: false,
  };
  if (typeof window === "undefined") return status;

  const store = readStore();
  const now = Date.now();

  for (const entry of Object.values(store)) {
    if (
      entry.detectedAt &&
      !entry.dismissed &&
      now - entry.detectedAt < NEW_BADGE_TTL_MS
    ) {
      status[entry.category] = true;
    }
  }
  return status;
}

export function subscribeMacroDataUpdates(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
