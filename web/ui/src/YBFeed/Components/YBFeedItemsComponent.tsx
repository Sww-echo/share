import { createContext, useEffect, useState } from 'react';
import { Button } from '@mantine/core';
import { IconArrowsSort, IconFile, IconFileText, IconPhoto, IconRefresh } from '@tabler/icons-react';
import { YBFeedItemComponent } from './YBFeedItemComponent';
import { Connector } from '../YBFeedConnector';
import type { YBFeedItem } from '../YBFeedItem';
import { errorStatus } from '../feedback';

export const FeedItemContext = createContext<YBFeedItem | undefined>(undefined);
export type ConnectionStatus = 'connecting' | 'live' | 'polling' | 'offline';

interface YBFeedItemsComponentProps {
  feedName: string;
  secret: string;
  initialItems: YBFeedItem[];
  onCountChange: (count: number) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  onUnauthorized: () => void;
  clearVersion: number;
}

export function YBFeedItemsComponent({ feedName, secret, initialItems, onCountChange, onStatusChange, onUnauthorized, clearVersion }: YBFeedItemsComponentProps) {
  const [items, setItems] = useState<YBFeedItem[]>(initialItems);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [retry, setRetry] = useState(0);

  useEffect(() => { onCountChange(items.length); }, [items.length, onCountChange]);
  useEffect(() => { onStatusChange(status); }, [status, onStatusChange]);
  useEffect(() => { if (clearVersion > 0) setItems([]); }, [clearVersion]);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let polling: number | undefined;
    let recovery: number | undefined;
    let fetching = false;
    setStatus('connecting');

    const clearTimers = () => {
      window.clearInterval(polling);
      window.clearInterval(recovery);
      polling = undefined;
      recovery = undefined;
    };
    const fetchSnapshot = async (force = false) => {
      if (disposed || fetching) return;
      fetching = true;
      try {
        const feed = await Connector.GetFeed(feedName);
        if (disposed) return;
        if (socket?.readyState !== WebSocket.OPEN || force) setItems(feed.items || []);
        if (socket?.readyState !== WebSocket.OPEN) setStatus('polling');
      } catch (error) {
        if (!disposed) {
          if (errorStatus(error) === 401) onUnauthorized();
          else if (socket?.readyState !== WebSocket.OPEN) setStatus('offline');
        }
      } finally { fetching = false; }
    };
    const startPolling = () => {
      if (disposed || polling !== undefined) return;
      void fetchSnapshot();
      polling = window.setInterval(() => void fetchSnapshot(), 5000);
      recovery = window.setInterval(connect, 30000);
    };
    const disconnect = () => {
      if (!socket) return;
      socket.onopen = null;
      socket.onclose = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.close();
      socket = null;
    };
    function connect() {
      if (disposed || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
      disconnect();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let current: WebSocket;
      try {
        current = new WebSocket(protocol + '//' + window.location.host + '/ws/' + encodeURIComponent(feedName) + '?secret=' + encodeURIComponent(secret));
      } catch { startPolling(); return; }
      socket = current;
      current.onopen = () => {
        if (disposed || socket !== current) return;
        clearTimers();
        setStatus('live');
        current.send('feed');
      };
      current.onmessage = (event) => {
        if (disposed || socket !== current) return;
        try {
          const data = JSON.parse(event.data) as { items?: YBFeedItem[]; action?: string; item?: YBFeedItem } | null;
          if (!data) return;
          if (Array.isArray(data.items)) { setItems(data.items); return; }
          if (data.action === 'empty') setItems([]);
          else if (data.action === 'remove' && data.item) setItems((previous) => previous.filter((item) => item.name !== data.item!.name));
          else if (data.action === 'add' && data.item) setItems((previous) => [data.item!, ...previous.filter((item) => item.name !== data.item!.name)]);
        } catch { /* Ignore malformed messages; the current content remains usable. */ }
      };
      current.onerror = () => { if (!disposed && socket === current) startPolling(); };
      current.onclose = (event) => {
        if (disposed || socket !== current) return;
        socket = null;
        if (event.code === 4401 || event.code === 4403) { onUnauthorized(); return; }
        startPolling();
      };
    }
    const refresh = (event: Event) => {
      if ((event as CustomEvent<string>).detail === feedName) void fetchSnapshot(true);
    };
    const online = () => { connect(); void fetchSnapshot(true); };
    const offline = () => { setStatus('offline'); };
    window.addEventListener('ybfeed:refresh', refresh);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    connect();
    return () => {
      disposed = true;
      clearTimers();
      disconnect();
      window.removeEventListener('ybfeed:refresh', refresh);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [feedName, secret, onUnauthorized, retry]);

  const deleteItem = async (item: YBFeedItem) => {
    await Connector.DeleteItem(item);
    setItems((previous) => previous.filter((existing) => existing.name !== item.name));
    window.dispatchEvent(new CustomEvent('ybfeed:refresh', { detail: feedName }));
  };
  const visibleItems = filter === 'all' ? items : items.filter((item) => item.type === filter);
  const filters = [{ value: 'all' as const, label: '全部' }, { value: 0, label: '文本' }, { value: 1, label: '图片' }, { value: 2, label: '文件' }];

  return (
    <section className="feed-section" aria-label="空间内容">
      <div className="feed-section-header"><h2>空间内容 <span className="item-count">{items.length}</span></h2><span className="sort-note"><IconArrowsSort size={13} /> 最新在前</span></div>
      {status === 'offline' && <div className="offline-notice" role="status"><span>连接暂时中断，已有内容仍可查看。</span><Button variant="subtle" size="compact-xs" onClick={() => setRetry((value) => value + 1)}>重新连接</Button></div>}
      {items.length > 0 && <div className="feed-filters" role="group" aria-label="按内容类型筛选">{filters.map((option) => <button type="button" className="feed-filter" key={option.value} aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>{option.label}</button>)}</div>}
      {visibleItems.length > 0 ? <div className="feed-list">{visibleItems.map((item) => <FeedItemContext.Provider value={item} key={item.name}><YBFeedItemComponent onDelete={deleteItem} /></FeedItemContext.Provider>)}</div> : <div className="empty-state">
        <div className="empty-illustration" aria-hidden="true"><span><IconFileText size={20} stroke={1.4} /></span><span><IconPhoto size={23} stroke={1.4} /></span><span><IconFile size={20} stroke={1.4} /></span></div>
        <h3>{items.length ? '还没有这类内容' : '空间准备好了，放点什么吧'}</h3>
        <p>{items.length ? '试试其他类型，或添加一条新内容。' : '粘贴一段文字，或拖入图片和文件。'}<br />{!items.length && '在另一台设备打开这个空间，就能接着使用。'}</p>
        {items.length > 0 && <Button variant="subtle" mt="sm" size="compact-sm" onClick={() => setFilter('all')}>查看全部内容</Button>}
      </div>}
      {items.length > 0 && <p className="feed-end"><IconRefresh size={12} /> 连接此空间的设备会自动同步更新</p>}
    </section>
  );
}
