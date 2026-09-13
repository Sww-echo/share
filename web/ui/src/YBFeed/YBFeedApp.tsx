import { ActionIcon, Tooltip, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { createBrowserRouter, Link, Outlet, RouterProvider } from 'react-router-dom';
import { YBFeedHome } from './YBFeedHome';
import { YBFeedFeed } from './YBFeedFeed';
import { YBFeedVersionComponent } from './Components/YBFeedVersionComponent';

function AppLayout() {
  const scheme = useComputedColorScheme('light');
  const { setColorScheme } = useMantineColorScheme();
  const themeLabel = scheme === 'dark' ? '切换浅色外观' : '切换深色外观';
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳转到主要内容</a>
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="ybFeed 首页">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none"><rect x="5" y="5" width="15" height="15" rx="4" stroke="currentColor" strokeWidth="2" opacity=".55" /><rect x="12" y="12" width="15" height="15" rx="4" fill="currentColor" /><path d="m17 19 2 2 4-4" stroke="var(--brand-mark-bg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span>yb<span className="brand-light">Feed</span></span>
          </Link>
          <span className="header-tagline">你的随身共享空间</span>
          <div className="header-tools">
            <span className="header-note">连接每一块屏幕</span>
            <Tooltip label={themeLabel}>
              <ActionIcon size={40} variant="subtle" color="gray" aria-label={themeLabel} onClick={() => setColorScheme(scheme === 'dark' ? 'light' : 'dark')}>
                {scheme === 'dark' ? <IconSun size={19} stroke={1.7} /> : <IconMoon size={19} stroke={1.7} />}
              </ActionIcon>
            </Tooltip>
          </div>
        </div>
      </header>
      <main id="main-content" className="app-main"><Outlet /></main>
      <footer className="app-footer">
        <span>ybFeed <span className="footer-dot">·</span> 内容随你，自在流动</span>
        <YBFeedVersionComponent />
      </footer>
    </div>
  );
}
const router = createBrowserRouter([
  { path: '/', element: <AppLayout />, children: [
    { index: true, element: <YBFeedHome /> },
    { path: ':feedName', element: <YBFeedFeed /> },
  ] },
]);
export function YBFeedApp() { return <RouterProvider router={router} />; }
