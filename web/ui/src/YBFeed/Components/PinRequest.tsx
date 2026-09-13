import { useState } from 'react';
import { Button, PinInput } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconLock } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../feedback';

interface PinRequestProps {
  feedName: string;
  sendPIN: (pin: string) => Promise<void>;
}

export function PinRequest({ feedName, sendPIN }: PinRequestProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (pin.length !== 4 || loading) return;
    setLoading(true);
    setError('');
    try { await sendPIN(pin); }
    catch (failure) { setError(errorMessage(failure, 'PIN 不正确或已过期，请重新确认。')); }
    finally { setLoading(false); }
  };
  return (
    <div className="access-page">
      <div className="access-card">
        <span className="section-icon"><IconLock size={24} stroke={1.5} /></span>
        <h1>用 PIN 连接空间</h1>
        <p>即将进入 <strong>{feedName}</strong><br />请在已连接的设备中打开「分享」，设置临时 PIN。</p>
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <div className="access-pin"><PinInput length={4} type="number" size="lg" value={pin} onChange={(value) => { setPin(value); setError(''); }} aria-label="输入四位临时 PIN" oneTimeCode /></div>
          {error && <p className="pin-error" role="alert">{error}</p>}
          <Button fullWidth size="md" type="submit" loading={loading} disabled={pin.length !== 4} rightSection={<IconArrowRight size={16} />}>连接空间</Button>
        </form>
        <p className="form-hint">PIN 在设置后 2 分钟内有效</p>
      </div>
      <Link to="/" className="access-back"><IconArrowLeft size={14} /> 返回首页，打开其他空间</Link>
    </div>
  );
}
