import { useEffect, useState } from 'react';
import { Button, Modal, TextInput } from '@mantine/core';
import { IconCheck, IconCopy, IconLink, IconLock } from '@tabler/icons-react';
import { copyText, errorMessage } from '../feedback';

interface ShareModalProps {
  opened: boolean;
  onClose: () => void;
  feedName: string;
  secret: string;
}

export function ShareModal({ opened, onClose, feedName, secret }: ShareModalProps) {
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'link' | 'space' | null>(null);
  const spaceURL = new URL('/' + encodeURIComponent(feedName), window.location.origin);
  const shareURL = new URL(spaceURL);
  shareURL.searchParams.set('secret', secret);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async (kind: 'link' | 'space') => {
    setError('');
    try {
      await copyText(kind === 'link' ? shareURL.href : spaceURL.href);
      setCopied(kind);
    } catch (failure) { setError(errorMessage(failure, '复制失败，请选中链接后手动复制。')); }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="连接另一台设备" size="md">
      <p className="share-description">把「{feedName}」带到另一块屏幕，内容会自动同步。</p>
      <div className="share-panel">
        <h3>使用密钥分享</h3>
        <p>分享下面的链接，持有链接的设备可以直接连接这个空间。</p>
        <div className="share-link-row">
          <TextInput value={shareURL.href} readOnly aria-label="分享链接" onFocus={(event) => event.currentTarget.select()} />
          <Button leftSection={copied === 'link' ? <IconCheck size={16} /> : <IconCopy size={16} />} onClick={() => void copy('link')}>{copied === 'link' ? '已复制' : '复制链接'}</Button>
        </div>
        <div className="share-notice"><IconLock size={14} /><span>链接中包含空间密钥，请仅分享给需要连接的设备。</span></div>
        <TextInput mt="lg" label="空间地址" value={spaceURL.href} readOnly aria-label="空间地址" onFocus={(event) => event.currentTarget.select()} />
        <div className="share-secondary-action">
          <Button variant="light" leftSection={copied === 'space' ? <IconCheck size={14} /> : <IconLink size={14} />} onClick={() => void copy('space')}>{copied === 'space' ? '已复制地址' : '复制空间地址'}</Button>
        </div>
      </div>
      {error && <p className="pin-error" role="alert">{error}</p>}
    </Modal>
  );
}
