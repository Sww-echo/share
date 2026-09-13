import { useContext, useState } from 'react';
import { Button, Modal } from '@mantine/core';
import { IconDownload, IconMaximize } from '@tabler/icons-react';
import { FeedItemContext } from './YBFeedItemsComponent';
import { itemURL } from '../feedback';

export function YBFeedItemImageComponent() {
  const item = useContext(FeedItemContext);
  const [opened, setOpened] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (!item) return null;
  const url = itemURL(item.feed.name, item.name);
  return (
    <>
      {failed ? <div className="card-error"><span>图片暂时无法加载</span><Button variant="subtle" size="compact-xs" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>重新加载</Button></div> : <button type="button" className="image-preview" aria-label={'查看大图：' + item.name} onClick={() => setOpened(true)}>
        <img src={url + (attempt ? '?retry=' + attempt : '')} alt={item.name} loading="lazy" onError={() => setFailed(true)} />
        <span className="image-preview-label"><IconMaximize size={12} /> 查看大图</span>
      </button>}
      <Modal opened={opened} onClose={() => setOpened(false)} title={item.name} size="xl">
        <img className="image-full" src={url} alt={item.name} />
        <Button mt="md" variant="light" component="a" href={url} download={item.name} leftSection={<IconDownload size={16} />}>下载原图</Button>
      </Modal>
    </>
  );
}
