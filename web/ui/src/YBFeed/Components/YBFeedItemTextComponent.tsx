import { useEffect, useMemo, useRef, useState } from 'react';
import { Switch } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import hljs from 'highlight.js';

const languages = hljs.listLanguages().sort();

export function YBFeedItemTextComponent({ children: text = '' }: { children?: string }) {
  const [language, setLanguage] = useState('auto');
  const [enabled, setEnabled] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const preview = useRef<HTMLPreElement>(null);
  const highlighted = useMemo(() => {
    if (!text || language === 'plain' || text.length > 100000) return null;
    try {
      const result = language === 'auto' ? hljs.highlightAuto(text) : hljs.highlight(text, { language });
      return language !== 'auto' || result.relevance > 5 ? result : null;
    } catch { return null; }
  }, [text, language]);
  const showCode = enabled && highlighted !== null;

  useEffect(() => {
    const element = preview.current;
    if (!element) return;
    const measure = () => setOverflows(element.scrollHeight > 272);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, showCode, expanded]);

  return (
    <div className="text-content">
      <pre ref={preview} className={'text-preview' + (showCode ? ' is-code' : '') + (!expanded ? ' is-collapsed' : '')}>
        {showCode ? <code dangerouslySetInnerHTML={{ __html: highlighted!.value }} /> : <code>{text}</code>}
      </pre>
      <div className="text-options">
        <div className="language-options">
          <select value={language} aria-label="文本显示语言" onChange={(event) => { setLanguage(event.currentTarget.value); setEnabled(true); }}>
            <option value="auto">{highlighted?.language ? '自动 · ' + highlighted.language : '自动 · 纯文本'}</option>
            <option value="plain">纯文本</option>
            {languages.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          {highlighted && <Switch size="xs" label="高亮" checked={enabled} onChange={(event) => setEnabled(event.currentTarget.checked)} styles={{ label: { fontSize: 11, color: 'var(--muted)' } }} />}
        </div>
        {overflows && <button className="text-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起内容' : '展开全文'}{expanded ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}</button>}
      </div>
    </div>
  );
}
