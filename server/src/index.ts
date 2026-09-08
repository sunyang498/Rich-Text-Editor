/**
 * 笔砚云版后端入口
 * Step1：仅 REST 认证；Step2 将在此同源挂载 Hocuspocus（/collaboration）
 */
import { createApp } from './app';
import { env, loadEnv } from './lib/env';

loadEnv();

const port = env.PORT;
const app = createApp();

app.listen(port, () => {
  console.log(`[biyan-server] REST listening on http://localhost:${port} (env: ${process.env.NODE_ENV ?? 'dev'})`);
});
