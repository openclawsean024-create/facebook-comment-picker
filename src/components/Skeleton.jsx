import React from 'react';

/**
 * 載入骨架屏 — 取代 spinner
 */
export function CommentSkeleton({ count = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2 animate-pulse">
          <div className="h-6 w-6 rounded-full bg-warning/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/4 rounded bg-warning/10" />
            <div className="h-2.5 w-3/4 rounded bg-warning/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSelectorSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 p-6">
      {[1, 2, 3].map((col) => (
        <div key={col} className="space-y-2 animate-pulse">
          <div className="h-4 w-32 rounded bg-warning/10" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-warning/5" />
          ))}
        </div>
      ))}
    </div>
  );
}
