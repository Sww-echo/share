import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Button, FileButton, Progress, Textarea, Tooltip } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconArrowUp, IconCheck, IconClipboard, IconCloudUpload, IconInfoCircle, IconPaperclip, IconPlus, IconX } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import { clipboardPayload, isEditingTarget, ReadClipboardToFeed, UploadClipboardToFeed } from '../../paste';
import type { ClipboardPayload } from '../../paste';
import { Y } from '../../YBFeedClient';
import { errorMessage, errorStatus } from '../feedback';

type UploadTask = () => Promise<unknown>;

export function YBPasteCardComponent() {
  const { feedName = '' } = useParams();
  const [draft, setDraft] = useState('');
  const [maxSize, setMaxSize] = useState(5 * 1024 ** 2);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [pasteHint, setPasteHint] = useState(false);
  const busyRef = useRef(false);
  const retryTask = useRef<{ task: UploadTask; label: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modifier = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
  const maxSizeLabel = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(maxSize / 1024 ** 2) + ' MB';

  useEffect(() => {
    let active = true;
    Y.get('/infos').then((info) => {
      const size = (info as { maxBodySize?: number }).maxBodySize;
      if (active && size && size > 0) setMaxSize(size);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const runUpload = useCallback(async (task: UploadTask, label: string) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    retryTask.current = { task, label };
    setBusy(true);
    setError('');
    setFeedback(label);
    setProgress(0);
    try {
      await task();
      setProgress(100);
      setFeedback('已添加到空间');
      retryTask.current = null;
      window.dispatchEvent(new CustomEvent('ybfeed:refresh', { detail: feedName }));
      return true;
    } catch (failure) {
      setError(errorMessage(failure, '上传没有完成，请检查网络后重试。'));
      if (errorStatus(failure) === 413 || errorStatus(failure) === 401) retryTask.current = null;
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [feedName]);

  const uploadPayload = useCallback((payload: ClipboardPayload) => {
    if (payload.data.size > maxSize) {
      retryTask.current = null;
      setError('内容超过单次上传大小限制，请缩小后再试。');
      return;
    }
    void runUpload(() => UploadClipboardToFeed(feedName, payload, (event) => {
      if (event.total) setProgress(Math.min(95, Math.round(event.loaded / event.total * 100)));
    }), payload.type.startsWith('image/') ? '正在上传图片…' : '正在添加文本…');
  }, [feedName, maxSize, runUpload]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || isEditingTarget(event.target)) return;
      const payload = clipboardPayload(event);
      if (!payload) return;
      event.preventDefault();
      if (busyRef.current) {
        notifications.show({ message: '正在上传，请完成后再粘贴。', color: 'yellow' });
        return;
      }
      uploadPayload(payload);
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [uploadPayload]);

  const uploadFiles = (files: File[]) => {
    if (!files.length || busyRef.current) return;
    if (files.some((file) => file.size > maxSize)) {
      retryTask.current = null;
      setError('所选文件中有文件超过 ' + maxSizeLabel + '，请重新选择。');
      return;
    }
    const remaining = [...files];
    const total = files.length;
    void runUpload(async () => {
      while (remaining.length) {
        const file = remaining[0];
        const formData = new FormData();
        formData.append('file', file);
        setFeedback('正在上传 ' + file.name + (total > 1 ? '（' + (total - remaining.length + 1) + '/' + total + '）' : ''));
        await Y.post('/feeds/' + encodeURIComponent(feedName), formData, { onUploadProgress: (event) => {
          if (event.total) setProgress(Math.min(95, Math.round(((total - remaining.length) + event.loaded / event.total) / total * 100)));
        } });
        // A retry resumes with the failed file instead of sending completed files again.
        remaining.shift();
      }
    }, '准备上传…');
  };

  const sendDraft = async () => {
    if (!draft.trim() || busyRef.current) return;
    const text = draft;
    const payload = { data: new Blob([text], { type: 'text/plain' }), type: 'text/plain' };
    if (payload.data.size > maxSize) {
      retryTask.current = null;
      setError('文本超过 ' + maxSizeLabel + '，请缩短内容后重试。');
      return;
    }
    const sent = await runUpload(() => UploadClipboardToFeed(feedName, payload), '正在发送文本…');
    if (sent) setDraft((current) => current === text ? '' : current);
  };

  const readClipboard = () => {
    if (!navigator.clipboard?.read) {
      inputRef.current?.focus();
      setPasteHint(true);
      return;
    }
    void runUpload(async () => {
      if (!await ReadClipboardToFeed(feedName)) throw new Error('剪贴板中没有可上传的文本或图片。');
    }, '正在读取剪贴板…');
  };

  return (
    <section aria-label="添加内容">
      <div className="upload-card">
        <div className="upload-heading">
          <h2><IconPlus size={18} stroke={1.8} /> 添加到空间</h2>
          <span className="upload-shortcut">在空白处按 <kbd>{modifier}</kbd><kbd>V</kbd> 快速添加</span>
        </div>
        <Textarea ref={inputRef} className="upload-textarea" aria-label="输入或粘贴文本" placeholder="写点什么，或粘贴内容…" autosize minRows={3} maxRows={9} value={draft} onChange={(event) => setDraft(event.currentTarget.value)} onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); void sendDraft(); }
        }} onPaste={(event) => {
          const payload = clipboardPayload(event.nativeEvent);
          if (payload?.type.startsWith('image/')) {
            event.preventDefault();
            event.stopPropagation();
            if (!busyRef.current) uploadPayload(payload);
          }
        }} />
        <div className="upload-toolbar">
          <div className="upload-actions">
            <FileButton multiple onChange={uploadFiles} disabled={busy}>
              {(props) => <Button {...props} variant="subtle" leftSection={<IconPaperclip size={17} stroke={1.7} />} disabled={busy}>选择文件</Button>}
            </FileButton>
            <Button variant="subtle" leftSection={<IconClipboard size={17} stroke={1.7} />} onClick={readClipboard} disabled={busy}>粘贴</Button>
          </div>
          <Tooltip label={modifier + ' + Enter 发送文本'}>
            <Button className="upload-send" leftSection={<IconArrowUp size={16} />} disabled={!draft.trim() || busy} loading={busy} onClick={() => void sendDraft()}>发送</Button>
          </Tooltip>
        </div>
        {(feedback || error) && <div className="upload-feedback" data-error={Boolean(error)} role={error ? 'alert' : 'status'}>
          <div className="upload-feedback-line">
            <span>{!busy && !error && <IconCheck size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />}{error || feedback}</span>
            {error && retryTask.current ? <Button size="compact-xs" variant="subtle" onClick={() => {
              const retry = retryTask.current;
              if (retry) void runUpload(retry.task, retry.label);
            }}>重试</Button> : !busy && <ActionIcon size="sm" variant="subtle" color="gray" aria-label="关闭上传提示" onClick={() => { setError(''); setFeedback(''); }}><IconX size={13} /></ActionIcon>}
          </div>
          {busy && <Progress value={progress} size={3} aria-label="上传进度" />}
        </div>}
      </div>
      <div className="upload-hint">
        <span><IconInfoCircle size={13} /> 支持文本、图片和文件 · 单个文件最大 {maxSizeLabel}</span>
        <span>{pasteHint ? '在输入框长按粘贴，再点击发送。' : '也可以将文件直接拖到页面'}</span>
      </div>
      <Dropzone.FullScreen active={!busy} onDrop={uploadFiles} maxSize={maxSize} onReject={() => {
        retryTask.current = null;
        setError('文件无法上传，请确认大小不超过 ' + maxSizeLabel + '。');
      }}>
        <div className="drop-overlay"><IconCloudUpload size={64} stroke={1.2} /><h2>松开，放进这个空间</h2><p>支持多个文件，每个不超过 {maxSizeLabel}</p></div>
      </Dropzone.FullScreen>
    </section>
  );
}
