import React, { useEffect, useState } from 'react';

/**
 * 簡單 toast 通知元件
 * - 自動 3 秒後消失
 * - 4 種類型: success, error, info, warning
 */
export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message || !visible) return null;

  const colors = {
    success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    error: 'bg-red-50 border-red-300 text-red-800',
    info: 'bg-blue-50 border-blue-300 text-blue-800',
    warning: 'bg-amber-50 border-amber-300 text-amber-800',
  };

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  return (
    <div
      role="alert"
      className={`fixed bottom-4 right-4 z-50 max-w-md rounded-2xl border-2 ${colors[type] || colors.info} px-5 py-3 shadow-2xl backdrop-blur-sm transition-all duration-300`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{icons[type] || icons.info}</span>
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={() => { setVisible(false); onClose?.(); }}
          className="ml-2 text-lg opacity-50 hover:opacity-100 transition"
          aria-label="關閉"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
