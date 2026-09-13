import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import { createTheme, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { YBFeedApp } from './YBFeed/YBFeedApp';
import './App.css';

const theme = createTheme({
  primaryColor: 'teal',
  primaryShade: { light: 7, dark: 4 },
  colors: {
    teal: ['#edf8f4', '#d7eee4', '#b4decd', '#89cbb2', '#5bb594', '#399a7b', '#238368', '#176d57', '#125a48', '#104b3d'],
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  fontFamilyMonospace: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  headings: { fontWeight: '650' },
  defaultRadius: 'md',
  components: {
    Button: { defaultProps: { size: 'sm', radius: 'md' } },
    Modal: { defaultProps: { centered: true, radius: 'lg', padding: 'xl', overlayProps: { backgroundOpacity: 0.3, blur: 4 } } },
    Tooltip: { defaultProps: { withArrow: true, openDelay: 350 } },
  },
});

export default function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-center" autoClose={3000} />
      <YBFeedApp />
    </MantineProvider>
  );
}
