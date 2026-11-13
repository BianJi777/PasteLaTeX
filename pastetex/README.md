# pastetex  v0.2.0

Typora 插件：把从 AI 聊天框复制出来的公式（KaTeX **MathML**，通常没有 `<annotation>`）转换成 Typora 能渲染的 `$...$`。

## 为什么需要

DeepSeek / ChatGPT 网页端复制出的 HTML 里，公式是：

    <span class="katex">
      <span class="katex-mathml"><math><semantics><mrow>…</mrow></semantics></math></span>
      <span class="katex-html">…视觉排版…</span>
    </span>

**没有 `<annotation encoding="application/x-tex">`**，拿不到原始公式源码（TeX / LaTeX 数学语法），直接粘贴会在 Typora 里变成重复的扁平文字。

插件在粘贴时把每个 `.katex` 还原成 TeX，再交给 Typora 自己的
`editor.UserOp.pasteHandler`，列表、加粗、撤销栈都保持原样。

## 处理流程

    paste (capture)
      ├─ 有 text/markhtml        → 跳过（Typora 内部复制）
      ├─ HTML 无 katex / math    → 跳过（普通粘贴）
      └─ 有公式 → .katex 换成 $tex$
                → getMarkdownSourceFrom() 转 Markdown
                → 把 $$…$$ 展开成独立块（前后空行）
                → pasteHandler(editor, markdown, true)

## 能力矩阵

| 类别 | 状态 |
|---|---|
| 上下标、分数、根式 | ✅ |
| 希腊字母、运算符 | ✅ |
| 求和 / 求积 / 积分 / 极限 | ✅ |
| 控制词边界（`\\sum TD` → `\\sum TD`） | ✅ |
| 矩阵、分段函数、多行对齐 | ✅ |
| 重音、向量、上下括号 | ✅ |
| 集合、逻辑、组合数 | ✅ |
| 文本、角度、几何符号 | ✅ |
| 嵌套公式 | ✅ |
| 化学式 `\\ce{}` | ⚠️ 降级为纯文本 |
| `\\color` / `\\cancel` | ⚠️ 样式丢失（源头无信息） |
| `\\binom` | ⚠️ 显示为括号内分数 |

## 已知限制

- 只处理 **HTML 路径**（聊天框复制的富文本）。纯文本里的 `\\(...\\)` 暂不转换。
- `\\color`、`\\cancel`、`\\ce` 的信息在 KaTeX 生成的 MathML 里就不存在，无法还原。
- 块级公式统一按 `$$\n…\n$$` 输出，依赖 Typora 的 MathJax。

## 安装

    node build-plugin.mjs
    powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1

安装位置：

    %APPDATA%\Typora\plugins\plugins\pastetex\
    %APPDATA%\Typora\plugins\settings\plugins.json

重启 Typora 生效。

## 卸载

    powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1

## 目录

    ../m2t/mathml2tex.mjs   纯函数转换器（与 Obsidian 版共用）
    glue-plugin.js          插件逻辑
    build-plugin.mjs        构建（把转换器内联进 dist/main.js）
    manifest.json           插件清单
    install.ps1             安装
    uninstall.ps1           卸载
    dist/main.js            产物

## 调试

`glue-plugin.js` 顶部 `var DEBUG = false;`。需要排查时改成 `true`、重新构建部署，
日志写到 `%USERPROFILE%\.typora\paste-math.log`。
