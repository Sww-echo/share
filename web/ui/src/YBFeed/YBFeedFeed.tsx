import { useCallback, useEffect, useState } from 'react';
import { ActionIcon, Button, Group, Menu, Modal, Skeleton, Stack } from '@mantine/core';
import { IconArrowLeft, IconChevronRight, IconDots, IconHash, IconRefresh, IconShare2, IconTrash, IconWifiOff } from '@tabler/icons-react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { YBPasteCardComponent } from './Components/YBPasteCardComponent';
import { YBFeedItemsComponent } from './Components/YBFeedItemsComponent';
import type { ConnectionStatus } from './Components/YBFeedItemsComponent';
import { YBNotificationToggleComponent } from './Components/YBNotificationToggleComponent';
import { PinRequest } from './Components/PinRequest';
import { ShareModal } from './Components/ShareModal';
import { Connector } from './YBFeedConnector';
import type { YBFeed } from './YBFeed';
import { errorMessage, errorStatus } from './feedback';

const statusLabels: Record<ConnectionStatus, string> = { connecting: '正在连接', live: '实时同步中', polling: '定时同步中', offline: '连接已中断' };

export function YBFeedFeed() {
  const { feedName } = useParams();
  return feedName ? <FeedWorkspace key={feedName} feedName={feedName} /> : <Navigate to="/" replace />;
}

function FeedWorkspace({ feedName }: { feedName: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSecret = searchParams.get('secret');
  const [feed, setFeed] = useState<YBFeed | null>(null);
  const [access, setAccess] = useState<'loading' | 'ready' | 'locked' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [count, setCount] = useState(0);
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [sharing, setSharing] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [emptying, setEmptying] = useState(false);
  const [emptyError, setEmptyError] = useState('');
  const [clearVersion, setClearVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setAccess('loading');
    Connector.GetFeed(feedName, urlSecret || undefined).then((result) => {
      if (!active) return;
      if (!result.secret) { setAccess('locked'); return; }
      setFeed(result);
      setCount(result.items?.length || 0);
      setAccess('ready');
      if (urlSecret) navigate('/' + encodeURIComponent(feedName), { replace: true });
    }).catch((error) => {
      if (active) setAccess(errorStatus(error) === 401 ? 'locked' : 'error');
    });
    return () => { active = false; };
  }, [feedName, urlSecret, navigate, retry]);

  useEffect(() => {
    document.title = feedName + ' · ybFeed';
    return () => { document.title = 'ybFeed · 你的随身共享空间'; };
  }, [feedName]);

  const unauthorized = useCallback(() => { setFeed(null); setAccess('locked'); }, []);
  const sendPIN = async (pin: string) => {
    try {
      const result = await Connector.GetFeed(feedName, pin);
      if (!result.secret) throw new Error('PIN 不正确或已过期，请重新确认。');
      setFeed(result);
      setCount(result.items?.length || 0);
      setAccess('ready');
      if (urlSecret) navigate('/' + encodeURIComponent(feedName), { replace: true });
    } catch (error) {
      if (errorStatus(error) === 401) throw new Error('PIN 不正确或已过期，请重新确认。');
      throw error;
    }
  };
  const emptyFeed = async () => {
    setEmptying(true);
    setEmptyError('');
    try {
      await Connector.EmptyFeed(feedName);
      setClearVersion((value) => value + 1);
      setConfirmEmpty(false);
    } catch (error) { setEmptyError(errorMessage(error, '清空没有完成，请稍后重试。')); }
    finally { setEmptying(false); }
  };

  if (access === 'locked') return <PinRequest feedName={feedName} sendPIN={sendPIN} />;
  if (access === 'error') return <div className="access-page"><div className="access-card">
    <span className="section-icon"><IconWifiOff size={24} /></span><h1>暂时无法打开空间</h1>
    <p>连接似乎中断了。请确认服务可用后，再试一次。</p>
    <Button leftSection={<IconRefresh size={16} />} onClick={() => setRetry((value) => value + 1)}>重新连接</Button>
    </div><Link to="/" className="access-back"><IconArrowLeft size={14} /> 返回首页</Link></div>;
  if (access === 'loading' || !feed?.secret) return <div className="loading-page" role="status" aria-label="正在打开空间"><Stack gap="xl"><Skeleton height={22} width={140} /><Skeleton height={60} /><Skeleton height={230} radius="lg" /><Skeleton height={150} radius="lg" /></Stack></div>;

  return (
    <div className="workspace">
      <nav className="workspace-breadcrumb" aria-label="当前位置"><Link to="/">首页</Link><IconChevronRight size={12} /><span>共享空间</span></nav>
      <div className="workspace-heading">
        <div className="workspace-identity"><span className="workspace-symbol"><IconHash size={25} stroke={1.5} /></span><div className="workspace-title"><h1>{feedName}</h1><p>在这里放下内容，在另一台设备继续。</p></div></div>
        <div className="heading-actions">
          <span className="connection-status" data-status={connection} role="status"><span className="status-dot" />{statusLabels[connection]}</span>
          {feed.vapidpublickey && <YBNotificationToggleComponent vapid={feed.vapidpublickey} feedName={feedName} />}
          <Button leftSection={<IconShare2 size={16} stroke={1.7} />} onClick={() => setSharing(true)}>分享空间</Button>
          <Menu position="bottom-end" shadow="sm" width={185}>
            <Menu.Target><ActionIcon variant="subtle" color="gray" size={36} aria-label="空间更多操作"><IconDots size={20} /></ActionIcon></Menu.Target>
            <Menu.Dropdown><Menu.Label>空间操作</Menu.Label><Menu.Item leftSection={<IconTrash size={15} />} color="red" disabled={count === 0} onClick={() => { setEmptyError(''); setConfirmEmpty(true); }}>清空全部内容</Menu.Item></Menu.Dropdown>
          </Menu>
        </div>
      </div>
      <YBPasteCardComponent />
      <YBFeedItemsComponent feedName={feedName} secret={feed.secret} initialItems={feed.items || []} onCountChange={setCount} onStatusChange={setConnection} onUnauthorized={unauthorized} clearVersion={clearVersion} />
      <ShareModal opened={sharing} onClose={() => setSharing(false)} feedName={feedName} secret={feed.secret} />
      <Modal opened={confirmEmpty} onClose={() => !emptying && setConfirmEmpty(false)} title="清空这个空间？" size="sm">
        <p className="dialog-copy">空间中的 {count} 条内容会从所有连接的设备中移除，此操作无法撤销。</p>
        {emptyError && <p className="pin-error" role="alert">{emptyError}</p>}
        <Group justify="flex-end"><Button variant="default" onClick={() => setConfirmEmpty(false)} disabled={emptying}>取消</Button><Button color="red" loading={emptying} onClick={() => void emptyFeed()}>确认清空</Button></Group>
      </Modal>
    </div>
  );
}
