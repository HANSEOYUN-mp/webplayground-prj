"use client";

import React from "react";
import { dismissNewBadge } from "@/lib/new-data-tracker";

interface NewDataBadgeProps {
  isNew?: boolean;
  trackerKey?: string;
  previousVersion?: string;
  latestVersion?: string;
  onDismiss?: () => void;
  className?: string;
}

export function NewDataBadge({
  isNew,
  trackerKey,
  previousVersion,
  latestVersion,
  onDismiss,
  className = "",
}: NewDataBadgeProps) {
  if (!isNew) return null;

  const tooltipText =
    previousVersion && latestVersion
      ? `새로운 데이터 업데이트 감지 (${previousVersion} ➔ ${latestVersion}) · 클릭 시 NEW 표시 닫기`
      : latestVersion
      ? `새로운 데이터 업데이트 (${latestVersion})`
      : "새로운 데이터가 추가되었습니다";

  return (
    <span
      onClick={(e) => {
        if (trackerKey) {
          e.stopPropagation();
          dismissNewBadge(trackerKey);
          onDismiss?.();
        }
      }}
      title={tooltipText}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8.5px] font-black font-mono tracking-wider uppercase bg-rose-500 text-white border border-rose-400 shadow-sm animate-pulse select-none leading-none ${
        trackerKey ? "cursor-pointer hover:bg-rose-600" : ""
      } ${className}`}
    >
      NEW
    </span>
  );
}
