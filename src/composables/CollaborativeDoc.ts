import { ref, watch, onBeforeUnmount, type Ref, inject } from 'vue'
import { useEditorContext } from './EditorContext'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { ySyncPlugin, yCursorPlugin, yUndoPlugin } from 'y-prosemirror'
import type { Editor } from '@tiptap/vue-3'

/**
 * 用户信息元数据，用于 awareness（光标展示、在线用户列表等）
 */
type UserMeta = {
    name?: string
    color?: string
    id?: string | number
}

/**
 * 协同编辑组合函数（Composable）
 *
 * 说明（中文）：
 *  - 本 composable 将负责 Yjs 文档（Y.Doc）与 y-websocket 的连接（provider）以及
 *    可选地把 y-prosemirror 插件注册到 tiptap/editor 中，从而实现多人实时协同编辑。
 *  - 当前项目的 `Editor.vue` 已经在创建编辑器时调用了 `provide('ydoc', ydoc)` 并且
 *    使用了 `@tiptap/extension-collaboration`。因此推荐在该场景下只使用本 composable 的
 *    provider/awareness 功能，而不重复注册 y-prosemirror 插件（避免重复绑定）。
 *
 * 使用示例：
 *  // 场景 A：Editor 已经使用 Collaboration extension（推荐）
 *  const collab = useCollaborativeDoc({ url: 'ws://192.168.1.100:1234', room: 'room1', registerPlugins: false })
 *
 *  // 场景 B：不使用 tiptap 的 Collaboration extension，而由本 composable 注册 y-prosemirror 插件
 *  const collab = useCollaborativeDoc({ url: 'ws://localhost:1234', room: 'room1' })
 *
 * 局域网说明：如果客户端和 y-websocket 服务在同一局域网内（如家中或公司内网），
 * 可以直接把 provider 的 url 指向该服务的局域网 IP，例如：
 *   ws://192.168.1.100:1234
 * 不需要部署到公共地址（公网）。仅当需要跨互联网、跨网络段的用户协作时，才需要把 y-websocket
 * 服务部署到公共地址并使用 wss（TLS）。
 *
 * 公网部署示例（仅注释；如果你需要部署到公网，可参考下列连接示例）：
 *
 * // const collab = useCollaborativeDoc({
 * //   url: 'wss://collab.example.com', // 使用 wss 且指向已配置 TLS 的公共服务器
 * //   room: 'project-123',
 * //   registerPlugins: false,
 * // })
 *
 * 注意：y-websocket 服务本身需要在服务器端启动（例如使用 `y-websocket` npm 包提供的服务器）。
 * 本地调试快速启动命令（在项目或任意目录运行）：
 *   npx y-websocket --port 1234
 */
export function useCollaborativeDoc(options?: { url?: string; room?: string; user?: UserMeta; autoBind?: boolean; registerPlugins?: boolean }) {
    const url = options?.url ?? 'ws://localhost:1234'
    const room = options?.room ?? 'default-room'
    const user = options?.user ?? { name: 'Anonymous', color: '#ffa500' }
    const autoBind = options?.autoBind ?? true
    // 如果设置为 false，则此 composable 不会向 tiptap 注册 y-prosemirror 插件；
    // 该选项在 Editor 已经使用 @tiptap/extension-collaboration（仅需要 provider/awareness）时非常有用
    const registerPlugins = options?.registerPlugins ?? true

    // Editor context (a Ref<Editor|undefined>) provided by EditorContext
    const editorRef = useEditorContext() as Ref<Editor | undefined>

    // prefer a provided ydoc (Editor.vue does `provide('ydoc', ydoc)`), otherwise create our own
    const provided = inject('ydoc') as Y.Doc | undefined
    const ydoc = provided ?? new Y.Doc()
    const provider = new WebsocketProvider(url, room, ydoc)
    const yXmlFragment = ydoc.getXmlFragment('prosemirror')

    // connection state
    const connected = ref(false)

    provider.on('status', (ev: { status: string }) => {
        connected.value = ev.status === 'connected'
        // console.log('[y-websocket] status', ev.status)
    })

    // set awareness (user info shown in cursors)
    provider.awareness.setLocalStateField('user', {
        name: user.name ?? 'Anonymous',
        color: user.color ?? '#ffa500',
        id: user.id ?? Math.floor(Math.random() * 1e9),
    })

    // store plugins so they can be unregistered later
    let registeredPlugins: any[] = []

    function cursorBuilder(userState: any) {
        const cursor = document.createElement('span')
        cursor.classList.add('y-cursor')
        cursor.style.background = userState?.color ?? '#ffa500'
        cursor.style.padding = '1px 6px'
        cursor.style.borderRadius = '4px'
        cursor.style.color = '#fff'
        cursor.style.fontSize = '12px'
        cursor.textContent = userState?.name ?? 'User'
        return cursor
    }

    function bind() {
        const editor = editorRef?.value
        if (!editor) {
            // 编辑器尚未准备好，先不绑定
            return
        }

            if (registerPlugins) {
                // create ProseMirror plugins from y-prosemirror
                const plugins = [
                    ySyncPlugin(yXmlFragment),
                    yCursorPlugin(provider.awareness, { cursorBuilder }),
                    yUndoPlugin(),
                ]

                // register plugins into tiptap editor
                    plugins.forEach((p) => {
                        try {
                            editor.registerPlugin(p)
                            registeredPlugins.push(p)
                        } catch (e) {
                            // 最佳努力：如果 editor 不支持 registerPlugin（某些版本或封装可能没有），则跳过
                            // 可选：在开发时开启日志以便排查
                            // console.warn('registerPlugin 失败', e)
                        }
                    })
            }
    }

    function unbind() {
        const editor = editorRef?.value
        if (!editor) return
        // 尝试注销我们之前注册的插件
        registeredPlugins.forEach((p) => {
            try {
                // Editor has unregisterPlugin in most tiptap builds
                // 在大多数 tiptap 版本中 editor 提供 unregisterPlugin，若不存在则忽略
                // @ts-ignore
                if (typeof editor.unregisterPlugin === 'function') {
                    // @ts-ignore
                    editor.unregisterPlugin(p)
                }
            } catch (e) {
                // ignore
            }
        })
        registeredPlugins = []
    }

    function destroy() {
        unbind()
        try {
            provider.destroy()
        } catch (e) {
            // ignore
        }
        try {
            ydoc.destroy()
        } catch (e) {
            // ignore
        }
    }

    // auto bind when editor becomes available
    if (autoBind) {
        // if editor already present, bind immediately
        if (editorRef?.value) {
            bind()
        }
        // watch for editor to appear
        const stop = watch(
            () => editorRef?.value,
            (val) => {
                if (val) bind()
            }
        )
        onBeforeUnmount(() => stop())
    }

    // expose a minimal API for the app
    return {
        ydoc,
        provider,
        yXmlFragment,
        connected,
        bind,
        unbind,
        destroy,
    }
}

export default useCollaborativeDoc
