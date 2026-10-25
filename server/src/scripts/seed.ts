/**
 * 开发种子数据（M2-5）：演示账号 + 一篇「公开只读示例文档」
 *
 * 用途：给面试/简历访客一个可匿名访问的只读文档，同时验证 is_public 链路。
 * 运行：npm run seed（幂等：账号/文档已存在则复用，并把文档重置为公开）
 *
 * 为什么用 Y.XmlElement 构造正文：
 * 服务端没有 Tiptap 依赖，而 Tiptap Collaboration 把文档存在 Y.Doc 的 'default'
 * XmlFragment 中，节点名与 schema 名一致（paragraph / heading），因此可以直接构造
 * 合法 Yjs 状态，前端 Collaboration 扩展打开即可正常渲染。
 */
import * as Y from 'yjs';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/password';

const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? 'demo@biyan.local';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'demo12345';
const DEMO_NICKNAME = '笔砚演示';
const DEMO_TITLE = '笔砚文档 · 公开只读示例（点这里体验）';

type Block = { type: 'heading' | 'paragraph'; text: string; level?: number };

const BLOCKS: Block[] = [
  { type: 'heading', level: 1, text: '笔砚文档 · 公开只读示例' },
  {
    type: 'paragraph',
    text: '你正在查看一份「公开只读」文档：无需登录即可阅读，但任何写入都会被服务端拒绝（不是靠前端隐藏按钮）。',
  },
  { type: 'heading', level: 2, text: '这个项目做了什么' },
  {
    type: 'paragraph',
    text: '笔砚文档是一个富文本协同编辑器：Vue 3 + Tiptap 3 + Yjs CRDT，支持多人实时协同、AI 流式写作、账号体系与文档持久化。',
  },
  { type: 'heading', level: 2, text: '后端与权限' },
  {
    type: 'paragraph',
    text: 'REST（Express 5 + Prisma + MySQL）负责账号与文档元数据；协同走 Hocuspocus WSS。鉴权为 JWT 双令牌：access（2h）+ refresh（7d，单次使用并原子轮换）。',
  },
  {
    type: 'paragraph',
    text: '协同连接不直接携带 access token，而是用 60 秒有效的 HMAC ticket（绑定用户、角色、文档），握手时再回查数据库：文档被删除或关闭公开，旧票立即失效。',
  },
  { type: 'heading', level: 2, text: '权限模型（当前版本）' },
  {
    type: 'paragraph',
    text: '两态模型：owner 可读写；is_public=true 时任何人（含匿名）只读。只读由服务端 connectionConfig.readOnly 强制，客户端即使伪造写入也会被丢弃。',
  },
  { type: 'heading', level: 2, text: '可以继续追问的点' },
  {
    type: 'paragraph',
    text: '增量落库为什么用 append-only？Yjs update 天然是增量、可合并（Y.mergeUpdates），打开时全量重放即可恢复，无需业务层做冲突解决。',
  },
  {
    type: 'paragraph',
    text: '为什么写库要防抖？协同场景下每次击键都会产生 update，300ms 固定窗口批量合并能把写库次数降低一到两个数量级。',
  },
];

/** 构造一份 Tiptap/Yjs 兼容的文档状态 */
function buildDemoUpdate(): Uint8Array {
  const ydoc = new Y.Doc();
  const frag = ydoc.getXmlFragment('default');

  for (const block of BLOCKS) {
    const el = new Y.XmlElement(block.type);
    // 注意：heading.level 在 Tiptap schema 里是 number，存成字符串会被丢弃（回落为 h1），
    // 而 Y.XmlElement.setAttribute 的类型声明只允许 string，故此处做一次断言。
    if (block.type === 'heading') {
      (el as unknown as { setAttribute: (k: string, v: unknown) => void }).setAttribute(
        'level',
        block.level ?? 1
      );
    }
    const text = new Y.XmlText();
    text.insert(0, block.text);
    el.insert(0, [text]);
    frag.insert(frag.length, [el]);
  }

  return Y.encodeStateAsUpdate(ydoc);
}

async function main(): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { nickname: DEMO_NICKNAME },
    create: { email: DEMO_EMAIL, passwordHash, nickname: DEMO_NICKNAME },
  });

  const existing = await prisma.document.findFirst({
    where: { ownerId: user.id, title: DEMO_TITLE, deletedAt: null },
  });

  const doc =
    existing ??
    (await prisma.document.create({
      data: { ownerId: user.id, title: DEMO_TITLE, isPublic: true },
    }));

  // 重置为公开 + 重建正文（幂等：先清空旧增量再写入，避免重复叠内容）
  await prisma.document.update({ where: { id: doc.id }, data: { isPublic: true } });
  await prisma.yDocUpdate.deleteMany({ where: { documentId: doc.id } });
  await prisma.yDocUpdate.create({
    data: { documentId: doc.id, update: Buffer.from(buildDemoUpdate()) },
  });

  console.log('\n[seed] 公开只读示例文档已就绪');
  console.log(`  文档 ID : ${doc.id}`);
  console.log(`  访问地址 : http://localhost:5173/#/docs/${doc.id}`);
  console.log(`  演示账号 : ${DEMO_EMAIL} / ${DEMO_PASSWORD}（可登录后编辑自己的文档）`);
  console.log('  注意：修改 is_public 后需重启 server 才会重放新正文（文档在内存中缓存）\n');
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
