import { useEffect, useState } from 'react';
export function YBFeedVersionComponent() {
  const [version, setVersion] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api', { signal: controller.signal })
      .then((response) => setVersion(response.headers.get('Ybfeed-Version') || ''))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return <span>{version && version !== 'Unknown' ? '版本 ' + version : '文本 / 图片 / 文件'}</span>;
}
