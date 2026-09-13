export function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { status?: number; response?: { status?: number } };
  return candidate.response?.status ?? candidate.status;
}

export function errorMessage(error: unknown, fallback = '操作没有完成，请稍后重试。'): string {
  const status = errorStatus(error);
  if (status === 401) return '空间验证已失效，请重新打开分享链接或输入 PIN。';
  if (status === 413) return '内容超过大小限制，请选择较小的文件。';
  if (status && status >= 500) return '暂时无法连接到空间，请稍后重试。';
  if (error instanceof DOMException && error.name === 'NotAllowedError') return '浏览器没有授予剪贴板权限，请在输入框内手动粘贴。';
  if (error instanceof Error && /[\u4e00-\u9fff]/.test(error.message)) return error.message;
  return fallback;
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Local HTTP and some browser permission settings need the native copy fallback.
    }
  }
  const previousFocus = document.activeElement;
  const selection = document.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
  const field = document.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.style.cssText = 'position:fixed;left:-9999px;top:0;font-size:16px;';
  document.body.append(field);
  field.select();
  field.setSelectionRange(0, text.length);
  try {
    if (!document.execCommand('copy')) throw new Error('复制未完成，请选中内容后手动复制。');
  } finally {
    field.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      ranges.forEach((range) => selection.addRange(range));
    }
  }
}

export function itemURL(feedName: string, itemName: string) {
  return '/api/feeds/' + encodeURIComponent(feedName) + '/items/' + encodeURIComponent(itemName);
}

export function formatItemDate(date: string) {
  const timestamp = new Date(date);
  if (Number.isNaN(timestamp.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp);
}
