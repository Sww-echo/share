import { Button, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { IconArrowRight, IconCheck, IconDeviceLaptop, IconDeviceMobile, IconFileText, IconHash, IconPhoto, IconStack2 } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Connector } from './YBFeedConnector';
import { errorMessage, errorStatus } from './feedback';

export function YBFeedHome() {
  const navigate = useNavigate();
  const form = useForm({
    initialValues: { feedName: '', secret: '' },
    validate: {
      feedName: (value) => /^[a-zA-Z0-9]+$/.test(value.trim()) ? null : '空间名称请使用英文字母或数字',
      secret: (value) => value.length >= 4 ? null : '密钥至少需要 4 个字符',
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const openFeed = async ({ feedName, secret }: { feedName: string; secret: string }) => {
    const name = feedName.trim();
    setSubmitting(true);
    setSubmitError('');
    try {
      try {
        await Connector.CreateFeed(name, secret);
      } catch (error) {
        if (errorStatus(error) !== 409) throw error;
        await Connector.GetFeed(name, secret);
      }
      navigate('/' + encodeURIComponent(name) + '?secret=' + encodeURIComponent(secret));
    } catch (error) {
      setSubmitError(errorStatus(error) === 401 ? '密钥不正确，请重新输入。' : errorMessage(error, '空间无法打开，请稍后重试。'));
    } finally { setSubmitting(false); }
  };
  return (
    <div className="home-page">
      <div className="home-intro">
        <span className="eyebrow"><span className="tiny-dot" /> 小小空间，连接日常</span>
        <h1>在这里放下，<br /><span>在另一端继续。</span></h1>
        <p>文字、图片和文件，在你的设备之间轻松流转。<br className="desktop-break" />打开同一个空间，继续手边的事。</p>
      </div>
      <section className="home-card" aria-label="进入共享空间">
        <div className="home-form">
          <span className="section-icon"><IconStack2 size={23} stroke={1.6} /></span>
          <h2>从一个空间开始</h2>
          <p className="muted">给空间起个名字，或回到已有的空间。</p>
          <form onSubmit={form.onSubmit(openFeed)}>
            <TextInput label="空间名称" placeholder="例如 work2026" size="md" leftSection={<IconHash size={18} />} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} {...form.getInputProps('feedName')} />
            <TextInput label="空间密钥" placeholder="输入至少 4 个字符的长期密钥" size="md" type="password" mt="md" autoCapitalize="none" autoCorrect="off" autoComplete="new-password" spellCheck={false} {...form.getInputProps('secret')} />
            {submitError && <p className="pin-error" role="alert">{submitError}</p>}
            <Button type="submit" size="md" fullWidth loading={submitting} rightSection={<IconArrowRight size={18} />} mt="md">创建或进入空间</Button>
          </form>
          <p className="form-hint">新名称会使用此密钥创建空间；已有空间请输入原密钥进入。密钥不会过期，请妥善保存。</p>
        </div>
        <div className="home-visual" aria-hidden="true">
          <div className="device-label"><IconDeviceLaptop size={17} /> 从电脑，到手机</div>
          <div className="preview-window">
            <div className="preview-window-bar"><span /><span /><span /><b>我的共享空间</b></div>
            <div className="preview-note"><span className="preview-type"><IconFileText size={15} /> 一段文字</span><p>灵感、链接、待办……<br />换个屏幕，也能接着做。</p><span className="preview-status"><IconCheck size={13} /> 已同步</span></div>
            <div className="preview-file"><span className="preview-file-icon"><IconPhoto size={21} stroke={1.6} /></span><div>一些值得分享的画面<small>图片 · 随时取用</small></div><IconCheck size={16} className="text-accent" /></div>
          </div>
          <div className="preview-phone"><IconDeviceMobile size={22} stroke={1.5} /><div>另一块屏幕<small>内容，已经在这里</small></div><span className="phone-check"><IconCheck size={13} /></span></div>
          <p className="visual-caption">少一点来回，多一点顺手。</p>
        </div>
      </section>
      <div className="home-steps">
        <div><span>01</span><p><strong>打开空间</strong><small>一个好记的名字，就是入口</small></p></div>
        <div><span>02</span><p><strong>放入内容</strong><small>粘贴、输入，或拖入文件</small></p></div>
        <div><span>03</span><p><strong>换端继续</strong><small>使用同一个密钥连接设备</small></p></div>
      </div>
    </div>
  );
}
