import type { AxiosProgressEvent } from 'axios';
import { Y } from './YBFeedClient';

export interface ClipboardPayload { data: Blob; type: string }

export function clipboardPayload(event: ClipboardEvent): ClipboardPayload | null {
  const clipboard = event.clipboardData;
  if (!clipboard) return null;
  const image = Array.from(clipboard.items).find((item) => item.kind === 'file' && item.type.startsWith('image/'));
  const file = image?.getAsFile();
  if (file) return { data: file, type: file.type || image!.type };
  const text = clipboard.getData('text/plain');
  return text ? { data: new Blob([text], { type: 'text/plain' }), type: 'text/plain' } : null;
}

export function isEditingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"]'));
}

export const UploadClipboardToFeed = (feedName: string, payload: ClipboardPayload, onUploadProgress?: (event: AxiosProgressEvent) => void) => {
  const formData = new FormData();
  formData.append('clipboard', payload.data, payload.type.startsWith('image/') ? 'clipboard.png' : 'clipboard.txt');
  return Y.post('/feeds/' + encodeURIComponent(feedName), formData, { onUploadProgress });
};

export const PasteToFeed = async (event: ClipboardEvent, feedName: string) => {
  const payload = clipboardPayload(event);
  if (!payload) return false;
  event.preventDefault();
  event.stopPropagation();
  await UploadClipboardToFeed(feedName, payload);
  return true;
};

export const ReadClipboardToFeed = async (feedName: string) => {
  if (!navigator.clipboard?.read) throw new Error('请在输入框中长按或使用快捷键粘贴，再点击发送。');
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith('image/'));
    if (imageType) {
      await UploadClipboardToFeed(feedName, { data: await item.getType(imageType), type: imageType });
      return true;
    }
    if (item.types.includes('text/plain')) {
      const data = await item.getType('text/plain');
      if ((await data.text()).length > 0) {
        await UploadClipboardToFeed(feedName, { data, type: 'text/plain' });
        return true;
      }
    }
  }
  return false;
};
