import { useState } from 'react';
import { Button, TextInput } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconLock } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../feedback';

interface SecretRequestProps {
  feedName: string;
  sendSecret: (secret: string) => Promise<void>;
}

export function SecretRequest({ feedName, sendSecret }: SecretRequestProps) {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (secret.length < 4 || loading) {
      if (secret.length < 4) setError('密钥至少需要 4 个字符');
      return;
    }
    setLoading(true);
    setError('');
    try { await sendSecret(secret); }
    catch (failure) { setError(errorMessage(failure, '密钥不正确，请重新确认。')); }
    finally { setLoading(false); }
  };
  return (
    <div className="access-page">
      <div className="access-card">
        <span className="section-icon"><IconLock size={24} stroke={1.5} /></span>
        <h1>输入空间密钥</h1>
        <p>即将进入 <strong>{feedName}</strong><br />请输入创建空间时设置的长期密钥。</p>
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <TextInput type="password" size="lg" value={secret} onChange={(event) => { setSecret(event.currentTarget.value); setError(''); }} aria-label="输入空间密钥" autoComplete="current-password" />
          {error && <p className="pin-error" role="alert">{error}</p>}
          <Button fullWidth size="md" type="submit" loading={loading} disabled={secret.length < 4} rightSection={<IconArrowRight size={16} />}>连接空间</Button>
        </form>
        <p className="form-hint">密钥不会过期，请妥善保存。</p>
      </div>
      <Link to="/" className="access-back"><IconArrowLeft size={14} /> 返回首页，打开其他空间</Link>
    </div>
  );
}
