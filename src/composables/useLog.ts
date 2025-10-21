import { ref } from 'vue';
import AnsiToHtml from 'ansi-to-html';

interface LogEntry {
  content: string;
  html: string;
  type: 'stdout' | 'stderr';
  timestamp: Date;
}

const ansiConverter = new AnsiToHtml({
  fg: '#1f2937',
  bg: '#f9fafb',
  newline: true,
  escapeXML: true,
  stream: false,
  colors: [
    '#374151',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#3b82f6',
    '#a855f7',
    '#06b6d4',
    '#6b7280',
    '#9ca3af',
    '#f87171',
    '#34d399',
    '#fbbf24',
    '#60a5fa',
    '#c084fc',
    '#22d3ee',
    '#d1d5db',
  ],
});

// 语法高亮处理
function highlightLog(content: string): string {
  let html = ansiConverter.toHtml(content);

  // 高亮日期时间 (例如: 2025-10-21 15:45:28.033)
  html = html.replace(
    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})/g,
    '<span style="color: #3b82f6; font-weight: 600;">$1</span>'
  );

  // 高亮时间戳 (例如: 15:45:28)
  html = html.replace(
    /(\d{2}:\d{2}:\d{2})/g,
    '<span style="color: #3b82f6; font-weight: 600;">$1</span>'
  );

  // 高亮日志级别标签 [I] [W] [E]
  html = html.replace(/\[I\]/g, '<span style="color: #10b981; font-weight: 700;">[I]</span>');
  html = html.replace(/\[W\]/g, '<span style="color: #f59e0b; font-weight: 700;">[W]</span>');
  html = html.replace(/\[E\]/g, '<span style="color: #ef4444; font-weight: 700;">[E]</span>');

  // 高亮文件路径和行号 (例如: [sub/root.go:149])
  html = html.replace(
    /(\[[a-zA-Z0-9_/\\.]+:\d+\])/g,
    '<span style="color: #6b7280; font-style: italic;">$1</span>'
  );

  // 高亮 run id 和代理名称 (例如: [a8180bba72855847])
  html = html.replace(
    /(\[[a-f0-9]{16}\])/g,
    '<span style="color: #a855f7; font-weight: 600;">$1</span>'
  );

  // 高亮代理名称 (例如: [VI0A6ONmvGXe.a4As93ifXBVq])
  html = html.replace(
    /(\[[a-zA-Z0-9]+\.[a-zA-Z0-9]+\])/g,
    '<span style="color: #06b6d4; font-weight: 600;">$1</span>'
  );

  // 高亮关键词
  html = html.replace(/\b(success|successful)\b/gi, '<span style="color: #10b981; font-weight: 600;">$1</span>');
  html = html.replace(/\b(error|failed|failure)\b/gi, '<span style="color: #ef4444; font-weight: 600;">$1</span>');
  html = html.replace(/\b(warning|warn)\b/gi, '<span style="color: #f59e0b; font-weight: 600;">$1</span>');

  return html;
}

// 全局日志存储
const logs = ref<LogEntry[]>([]);
let unsubscribe: (() => void) | null = null;
let isInitialized = false;

// 初始化日志监听（只初始化一次）
function initializeLogListener() {
  if (isInitialized) return;

  isInitialized = true;

  // 注册全局日志监听器
  unsubscribe = window.frpcApi.onLog((content: string, type: 'stdout' | 'stderr') => {
    const html = highlightLog(content);

    logs.value.push({
      content,
      html,
      type,
      timestamp: new Date(),
    });

    // 限制日志数量，避免内存占用过大
    if (logs.value.length > 1000) {
      logs.value = logs.value.slice(-500);
    }
  });

  console.log('日志监听器已初始化');
}

// 清空日志
function clearLogs() {
  logs.value = [];
}

// 格式化时间
function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// 提供给组件使用的 composable
export function useLog() {
  // 确保日志监听已初始化
  initializeLogListener();

  return {
    logs,
    clearLogs,
    formatTime,
  };
}

// 导出单独的清空日志函数，供外部直接调用
export { clearLogs };

// 清理函数（在应用卸载时调用）
export function cleanupLogListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    isInitialized = false;
  }
}

