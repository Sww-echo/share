import { lazy, Suspense, useContext, useEffect, useState } from 'react';
import { ActionIcon, Button, Group, Menu, Modal, Skeleton } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconDots, IconDownload, IconFile, IconFileText, IconPhoto, IconTrash } from '@tabler/icons-react';
import { FeedItemContext } from './YBFeedItemsComponent';
import { YBFeedItemImageComponent } from './YBFeedItemImageComponent';
import { copyImageItem } from './clipboard';
import { Connector } from '../YBFeedConnector';
import type { YBFeedItem } from '../YBFeedItem';
import { copyText, errorMessage, formatItemDate, itemURL } from '../feedback';

const TextContent = lazy(() => import('./YBFeedItemTextComponent').then((module) => ({ default: module.YBFeedItemTextComponent })));
const typeLabels: Record<number, string> = { 0: '文本', 1: '图片', 2: '文件' };

export function YBFeedItemComponent({ onDelete }: { onDelete?: (item: YBFeedItem) => Promise<unknown> | void }) {
  const item = useContext(FeedItemContext);
  const [text, setText] = useState<string>();
  const [textError, setTextError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const feedName = item?.feed.name;
  const name = item?.name;
  const date = item?.date;
  const type = item?.type;

  useEffect(() => {
    if (!feedName || !name || type !== 0) return;
    let active = true;
    setText(undefined);
    setTextError(false);
    Connector.GetItem({ name, date: date || '', type, feed: { name: feedName } } as YBFeedItem)
      .then((content) => { if (active) setText(content); })
      .catch(() => { if (active) setTextError(true); });
    return () => { active = false; };
  }, [feedName, name, date, type, attempt]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!item) return null;
  const title = item.name.replace(/^Pasted Text (\d+)\.txt$/i, '文本片段 $1').replace(/^Pasted Image (\d+)\.png$/i, '粘贴的图片 $1').replace(/^clipboard\.txt$/i, '粘贴的文本').replace(/^clipboard\.png$/i, '粘贴的图片');
  const downloadURL = itemURL(item.feed.name, item.name);
  const copy = async () => {
    if (copying) return;
    setCopying(true);
    try {
      if (item.type === 0) await copyText(text ?? '');
      else await copyImageItem(item);
      setCopied(true);
    } catch (error) { notifications.show({ color: 'red', message: errorMessage(error, '复制没有完成，请重试或下载原文件。') }); }
    finally { setCopying(false); }
  };
  const remove = async () => {
    setDeleting(true);
    setDeleteError('');
    try { await onDelete?.(item); setConfirmDelete(false); }
    catch (error) { setDeleteError(errorMessage(error, '删除没有完成，请稍后重试。')); }
    finally { setDeleting(false); }
  };

  return (
    <article className="content-card" aria-label={typeLabels[item.type] + '：' + title}>
      <div className="card-heading">
        <div className="card-identity">
          <span className="item-type-icon" data-type={item.type}>{item.type === 0 ? <IconFileText size={20} stroke={1.6} /> : item.type === 1 ? <IconPhoto size={20} stroke={1.6} /> : <IconFile size={20} stroke={1.6} />}</span>
          <div className="card-titles"><h3 title={item.name}>{title}</h3><div className="card-meta"><span>{typeLabels[item.type]}</span><span className="meta-dot">·</span><time dateTime={item.date}>{formatItemDate(item.date)}</time></div></div>
        </div>
        <div className="card-actions">
          {item.type === 2 ? <Button variant="light" component="a" href={downloadURL} download={item.name} leftSection={<IconDownload size={15} />} aria-label={'下载 ' + title}><span className="card-action-label">下载</span></Button> : <Button className="copy-button" variant={copied ? 'light' : 'default'} leftSection={copied ? <IconCheck size={15} /> : <IconCopy size={15} />} loading={copying} disabled={item.type === 0 && text === undefined} onClick={() => void copy()} aria-label={(copied ? '已复制 ' : '复制 ') + title}><span className="card-action-label">{copied ? '已复制' : '复制'}</span></Button>}
          <Menu position="bottom-end" width={165} shadow="sm">
            <Menu.Target><ActionIcon variant="subtle" color="gray" size={34} aria-label={'更多操作：' + title}><IconDots size={18} /></ActionIcon></Menu.Target>
            <Menu.Dropdown>
              {item.type !== 2 && <Menu.Item component="a" href={downloadURL} download={item.name} leftSection={<IconDownload size={15} />}>下载原文件</Menu.Item>}
              <Menu.Item color="red" leftSection={<IconTrash size={15} />} disabled={!onDelete} onClick={() => { setDeleteError(''); setConfirmDelete(true); }}>删除内容</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      </div>
      {item.type === 0 && (textError ? <div className="card-error"><span>内容暂时无法加载</span><Button variant="subtle" size="compact-xs" onClick={() => setAttempt((value) => value + 1)}>重新加载</Button></div> : text === undefined ? <Skeleton height={70} m="md" /> : <Suspense fallback={<Skeleton height={70} m="md" />}><TextContent>{text}</TextContent></Suspense>)}
      {item.type === 1 && <YBFeedItemImageComponent />}
      {item.type === 2 && <div className="file-description">文件已就绪，可在任意已连接的设备下载。</div>}
      <Modal opened={confirmDelete} onClose={() => !deleting && setConfirmDelete(false)} title="删除这条内容？" size="sm">
        <p className="dialog-copy">「{title}」会从此空间及所有连接的设备中移除，此操作无法撤销。</p>
        {deleteError && <p className="pin-error" role="alert">{deleteError}</p>}
        <Group justify="flex-end"><Button variant="default" disabled={deleting} onClick={() => setConfirmDelete(false)}>取消</Button><Button color="red" loading={deleting} onClick={() => void remove()}>确认删除</Button></Group>
      </Modal>
    </article>
  );
}
