import type { YBFeedItem } from '../YBFeedItem';
import { itemURL } from '../feedback';

export async function copyImageItem(item: YBFeedItem) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('当前浏览器无法复制图片，请下载图片后使用。');
  }
  const imageData = new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('图片没有加载成功，请稍后重试。'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('当前浏览器无法复制图片，请下载后使用。'));
      try {
        context.drawImage(img, 0, 0);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片转换失败，请下载后使用。')), 'image/png');
      } catch (error) { reject(error); }
    };
    img.src = itemURL(item.feed.name, item.name);
  });
  // Keep the write call in the original user gesture, including on Safari.
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': imageData })]);
}
