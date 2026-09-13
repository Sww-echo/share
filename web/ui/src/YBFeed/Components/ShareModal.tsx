import { useEffect, useState } from 'react';
import { Button, Modal, PinInput, Progress, Tabs, TextInput } from '@mantine/core';
import { IconCheck, IconCopy, IconHash, IconLink, IconLock, IconRefresh } from '@tabler/icons-react';
import { Connector } from '../YBFeedConnector';
import { copyText, errorMessage } from '../feedback';

interface ShareModalProps {
  opened: boolean;
  onClose: () => void;
  feedName: string;
  secret: string;
}

export function ShareModal({ opened, onClose, feedName, secret }: ShareModalProps) {
  const [pin, setPin] = useState('');
  const [activePin, setActivePin] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'link' | 'space' | null>(null);
  const spaceURL = new URL('/' + encodeURIComponent(feedName), window.location.origin);
  const shareURL = new URL(spaceURL);
  shareURL.searchParams.set('secret', secret);
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= expiresAt) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

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

  const enablePin = async () => {
    if (pin.length !== 4 || saving) return;
    setSaving(true);
    setError('');
    try {
      await Connector.SetPIN(feedName, pin);
      const timestamp = Date.now();
      setActivePin(pin);
      setNow(timestamp);
      setExpiresAt(timestamp + 120000);
    } catch (failure) { setError(errorMessage(failure, 'PIN 设置失败，请重试。')); }
    finally { setSaving(false); }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="连接另一台设备" size="md">
      <p className="share-description">把「{feedName}」带到另一块屏幕，内容会自动同步。</p>
      <Tabs defaultValue="link" onChange={() => setError('')}>
        <Tabs.List grow>
          <Tabs.Tab value="link" leftSection={<IconLink size={16} />}>分享链接</Tabs.Tab>
          <Tabs.Tab value="pin" leftSection={<IconHash size={16} />}>临时 PIN</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="link" className="share-panel">
          <h3>打开链接，即可连接</h3>
          <p>在另一台设备的浏览器中打开下面的链接。</p>
          <div className="share-link-row">
            <TextInput value={shareURL.href} readOnly aria-label="分享链接" onFocus={(event) => event.currentTarget.select()} />
            <Button leftSection={copied === 'link' ? <IconCheck size={16} /> : <IconCopy size={16} />} onClick={() => void copy('link')}>{copied === 'link' ? '已复制' : '复制链接'}</Button>
          </div>
          <div className="share-notice"><IconLock size={14} /><span>持有此链接的设备可以直接访问空间，请仅分享给需要连接的设备。</span></div>
        </Tabs.Panel>
        <Tabs.Panel value="pin" className="share-panel">
          {!activePin ? <>
            <h3>不方便传链接？用 4 位 PIN 连接</h3>
            <p>设置 PIN 后，在另一台设备打开空间地址，输入 PIN 即可进入。</p>
            <div className="pin-entry">
              <PinInput value={pin} onChange={setPin} length={4} type="number" size="md" aria-label="设置四位临时 PIN" />
              <Button variant="subtle" size="compact-sm" leftSection={<IconRefresh size={14} />} onClick={() => setPin(String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0'))}>随机生成</Button>
            </div>
            <Button fullWidth onClick={() => void enablePin()} loading={saving} disabled={pin.length !== 4}>启用 PIN · 2 分钟内有效</Button>
          </> : <>
            <h3>{remaining > 0 ? 'PIN 已准备好' : '这个 PIN 已过期'}</h3>
            <p>{remaining > 0 ? '在另一台设备打开下方空间地址，然后输入这 4 位数字。' : '已连接的设备仍可继续使用。连接新设备时，请重新设置 PIN。'}</p>
            <div className="pin-display" aria-label={'PIN ' + activePin}>{activePin.split('').map((digit, index) => <span key={index}>{digit}</span>)}</div>
            <div className="pin-timer"><span>{remaining > 0 ? '剩余有效时间' : '有效时间已结束'}</span><strong>{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</strong></div>
            <Progress value={remaining / 120 * 100} size={4} aria-label="PIN 剩余有效时间" />
          </>}
          <TextInput mt="lg" label="空间地址" value={spaceURL.href} readOnly aria-label="空间地址" onFocus={(event) => event.currentTarget.select()} />
          <div className="share-secondary-action">
            <Button variant="light" leftSection={copied === 'space' ? <IconCheck size={14} /> : <IconCopy size={14} />} onClick={() => void copy('space')}>{copied === 'space' ? '已复制地址' : '复制空间地址'}</Button>
            {activePin && <Button variant="subtle" onClick={() => { setActivePin(''); setPin(''); setExpiresAt(0); setError(''); }}>设置新 PIN</Button>}
          </div>
        </Tabs.Panel>
      </Tabs>
      {error && <p className="pin-error" role="alert">{error}</p>}
    </Modal>
  );
}
