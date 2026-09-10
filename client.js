/* dsh-unknowcao-skin client half — 蔚来 · 地平线 / a NIO-inspired sky-and-horizon skin.
 *
 * 主题取自蔚来公开的品牌语言（「Blue Sky Coming」：标识上半是天、下半是地，天地
 * 交汇处是地平线）。蔚来没有公开可核实的标准色值，下面这套是照那份语言自己配的，
 * 不是官方色卡，也不含任何官方图形资源。
 *
 * ── 彩度纪律 ─────────────────────────────────────────────────────────────
 *
 * v0.4 的问题不是配色不好看，是**彩度失控**：表面色阶用了 28%–55% 的饱和度，于是
 * 深色模式整片变成饱和钢蓝（浮层甚至是 #476791 那种蓝），悬停蒙层还染着品牌蓝——
 * 颜色到处都在说话，就没有一处显得贵。
 *
 * 这一版把说话权收回到一处：**表面色阶近乎中性**（色相仍偏冷，彩度压到 6%–15%），
 * **整套界面只有一个饱和的东西**，就是强调族那一支天蓝。深色模式压成近黑（#0C1119
 * 而不是 #0B1623 那种蓝黑），层级靠明度拉开而不是靠色相。悬停蒙层改回中性墨色，
 * 悬停是「按下去一点」，不是「蓝一下」。
 *
 * ── 四层结构 ─────────────────────────────────────────────────────────────
 *
 * 契约层（theme 服务，13 个别名 token）
 *   `theme.overrideTokens()` 是主题包文档里写给第三方的正式扩展点。它以 inline
 *   style 写到 body 上，优先级高于任何样式表，所以这 13 个「门面」token 由它独家
 *   拥有——就算上游哪天改成内联下发，这一层依然赢。
 *
 * 系统层（皮肤样式表，设计系统自己的变量）
 *   产品把整套颜色分成两段：先是一族 `--dsw-static-*` 静态色阶，再由
 *   `--dsw-alias-*` 按语义引用它们。改色阶 = 一次性改掉所有派生出来的表面，而且
 *   「谁比谁深一档」的层级关系由产品自己维持。色阶是同一步在明暗两种模式下兼用的
 *   单一值，所以换色只换色相与饱和度，明度阶梯照搬产品原值。
 *
 * 品牌层（slot 注册，占三个单占位槽）
 *   侧栏的商标与品牌名、首页空会话的标记，换成自己的字样。这三个槽都是
 *   `single`，注册即遮蔽产品自带的占用者，卸载即还原。
 *
 * ── 规则 ─────────────────────────────────────────────────────────────────
 *
 *   · 不写任何产品类名选择器，不搬 DOM，不改布局。
 *   · 变量必须声明在 body 上：产品把色阶声明在 body，声明到 :root 会被 body 自己
 *     的值遮住（自定义属性按元素就近取值，不是优先级比赛）。用 `html body` 拿到比
 *     产品 `body` / `body[data-ds-dark-theme]` 更高的优先级，于是既不依赖样式表插入
 *     顺序，也不用 !important。
 *   · 唯一触碰的 DOM 是一个 <style> 元素，它归当前 fiber 所有：卸载 / HMR 时移除，
 *     页面逐字节回到原样。
 *
 * Delivery format matches the modules node half: a __ModuleLoader__ bundle served at
 * /plugins/dsh-unknowcao-skin/client.js. Nothing from @deepseek-ai is imported; `react` is
 * the kernel-provided module and only the brand layer needs it.
 */
window.__ModuleLoader__.load({
  id: 'dsh-unknowcao-skin',
  factory: (require) => {
    // Kernel-provided module. 颜色、排版、天光三层都是纯 CSS，不需要 React。
    const React = require('react')
    /* ═══════════════════════════════════════════════════════════════════════
     * 契约层：主题服务公布的 13 个别名 token，浅色 / 深色成对。
     *
     * 取值一律等于系统层色阶推导出的值，除非有写明的理由偏离——两层是同一份颜色的
     * 两个来源，无理由的偏离就是漂移（test/palette-audit.mjs 逐条列出，新漂移直接
     * 失败）。五处刻意偏离：
     *
     *   light brand-primary  #1B5FC1  品牌蓝主按钮。产品在这里放的是「高对比墨色」，
     *                                 换成天蓝是这套皮肤唯一的强调色；近白文字压在
     *                                 上面 5.8:1，过 AA。
     *   light state-warn     #916200  正文级赭。色阶 amber-500 必须留在阶梯上（它比
     *                                 600 浅），当正文用太亮。
     *   dark  bg-overlay     #333D4E  浮层只比页面抬一档（色阶 700 是给浅色下当次要
     *                                 文字用的中间调，拿来当深色浮层会跳成亮灰块）。
     *   dark  state-success  #7CC6A2  色阶的绿是给浅色配的，在近黑底上太沉
     *   dark  state-warn     #DCB47C  同上
     * ═══════════════════════════════════════════════════════════════════════ */
    const ALIAS_TOKENS = {
      '--dsw-alias-bg-base': { light: '#F7F9FC', dark: '#0C1119' },
      '--dsw-alias-bg-layer-1': { light: '#F7F9FC', dark: '#18202F' },
      '--dsw-alias-bg-layer-2': { light: '#F7F9FC', dark: '#1E283A' },
      '--dsw-alias-bg-overlay': { light: '#E2E8F1', dark: '#333D4E' },
      '--dsw-alias-border-l1': { light: '#0B1B2E14', dark: '#E8EFFA14' },
      '--dsw-alias-border-l2': { light: '#0B1B2E24', dark: '#E8EFFA24' },
      '--dsw-alias-brand-primary': { light: '#1B5FC1', dark: '#F2F5F9' },
      '--dsw-alias-label-primary': { light: '#080C12', dark: '#F2F5F9' },
      '--dsw-alias-label-secondary': { light: '#4E5D73', dark: '#C6CFDD' },
      '--dsw-alias-state-error-primary': { light: '#C43A45', dark: '#D57B80' },
      '--dsw-alias-state-success-primary': { light: '#15784A', dark: '#7CC6A2' },
      '--dsw-alias-state-warn-primary': { light: '#916200', dark: '#DCB47C' },
      '--dsw-specific-sidebar-fill': { light: '#F2F5F9', dark: '#121927' },
    }

    /* ═══════════════════════════════════════════════════════════════════════
     * 系统层：设计系统自己的变量。
     *
     * 三条色阶扛下全部颜色：
     *   neutral-bluish   表面族，冷色相、近中性——从近白一路到近黑，层级靠明度拉开
     *   deepseek + blue  强调族，全屏唯一饱和的东西 —— 用户气泡、选中态、信息色
     *   red/green/amber  状态色，同样压低彩度，只保留色相之间的区分度
     *
     * 色阶内部的明度阶梯照搬产品原值（这套阶梯是产品用来表达「谁浮在谁上面」的），
     * 只换色相与饱和度，且不降低任何一档的感知亮度——同一步在浅色下当背景、在深色
     * 下常常当文字，动明度必然弄坏其中一种模式。
     * ═══════════════════════════════════════════════════════════════════════ */
    const SKIN_CSS = `
/* ── 表面色阶：近白（浅）→ 近黑（深），一套阶梯两套主题共用 ───────────── */
html body {
  --dsw-static-neutral-bluish-00:#F7F9FC;
  --dsw-static-neutral-bluish-50:#F2F5F9;
  --dsw-static-neutral-bluish-60:#EFF3F8;
  --dsw-static-neutral-bluish-75:#ECF0F6;
  --dsw-static-neutral-bluish-100:#E7ECF3;
  --dsw-static-neutral-bluish-150:#E2E8F1;
  --dsw-static-neutral-bluish-200:#DBE2EC;
  --dsw-static-neutral-bluish-300:#C6CFDD;
  --dsw-static-neutral-bluish-400:#9DAABD;
  --dsw-static-neutral-bluish-500:#8593A8;
  /* 600 是深色下的 caption 色，明度必须跟住产品原值（#81858c）——压暗一点，
     深色 caption 就会从 4.9:1 掉到 4.1:1，跌穿 AA。 */
  --dsw-static-neutral-bluish-600:#75839A;
  --dsw-static-neutral-bluish-700:#4E5D73;
  --dsw-static-neutral-bluish-750:#36435A;
  --dsw-static-neutral-bluish-800:#28344A;
  --dsw-static-neutral-bluish-850:#1E283A;
  --dsw-static-neutral-bluish-875:#18202F;
  --dsw-static-neutral-bluish-900:#121927;
  --dsw-static-neutral-bluish-950:#0C1119;
  --dsw-static-neutral-bluish-1000:#080C12;

  /* ── 纯中性阶：滚动条、多选底 ─────────────────────────────────────── */
  --dsw-static-neutral-00:#F7F9FC;
  --dsw-static-neutral-50:#F3F6FA;
  --dsw-static-neutral-100:#EEF2F7;
  --dsw-static-neutral-150:#E8EDF4;
  --dsw-static-neutral-200:#E0E6EE;
  --dsw-static-neutral-250:#D6DDE7;
  --dsw-static-neutral-300:#CBD3DF;
  --dsw-static-neutral-400:#98A3B3;
  --dsw-static-neutral-500:#6B7A8F;
  --dsw-static-neutral-550:#55637A;
  --dsw-static-neutral-600:#454F60;
  --dsw-static-neutral-700:#303845;
  --dsw-static-neutral-800:#212833;
  --dsw-static-neutral-850:#1A202A;
  --dsw-static-neutral-900:#0B0E13;
  --dsw-static-neutral-1000:#000000;

  /* ── 天蓝族：全屏唯一的饱和色，用在气泡、选中态与信息色 ───────────── */
  --dsw-static-deepseek-50:#EFF4FB;
  --dsw-static-deepseek-100:#E3ECF8;
  --dsw-static-deepseek-200:#D0E0F4;
  --dsw-static-deepseek-300:#A8C6EC;
  --dsw-static-deepseek-400:#6C9BDC;
  --dsw-static-deepseek-450:#5489D5;
  --dsw-static-deepseek-500:#3B76C8;
  --dsw-static-deepseek-600:#2F62AB;
  --dsw-static-deepseek-700-delete:#244B84;
  --dsw-static-deepseek-800:#1D3D69;
  --dsw-static-deepseek-900:#172F50;

  --dsw-static-blue-50:#F1F5FB;
  --dsw-static-blue-50p:#EDF2FA;
  --dsw-static-blue-75:#E8EFF8;
  --dsw-static-blue-100:#DFE9F6;
  --dsw-static-blue-300:#A6C3E6;
  --dsw-static-blue-400:#77A3D8;
  --dsw-static-blue-450:#5F92D2;
  --dsw-static-blue-500:#4583CC;
  --dsw-static-blue-600:#3269AE;
  --dsw-static-blue-800:#234776;
  --dsw-static-blue-900:#183252;
  --dsw-static-blue-950:#122642;

  /* ── 状态色：同样压低彩度，只保留色相之间的区分度 ─────────────────── */
  --dsw-static-red-50:#FCF4F4;
  --dsw-static-red-100:#F8E6E7;
  --dsw-static-red-400:#D57B80;
  --dsw-static-red-500:#CC6670;
  --dsw-static-red-600:#C43A45;
  --dsw-static-red-900:#4A1C20;
  --dsw-static-green-100:#EDF7F2;
  --dsw-static-green-400:#7CC6A2;
  --dsw-static-green-500:#15784A;
  --dsw-static-green-900:#17372A;
  --dsw-static-amber-100:#FBF6EE;
  --dsw-static-amber-400:#DCB47C;
  --dsw-static-amber-500:#C99A4E;
  --dsw-static-amber-600:#BC8A34;
  --dsw-static-amber-900:#2E2413;

  /* ── 写死的别名：产品没走色阶、直接给字面值的那几个 ───────────────── */
  /* 发丝线：冷墨半透明。保持半透明是有意的——同一条线要同时落在近白、卡片和
     浮层上，实色做不到。 */
  --dsw-alias-border-l1:#0B1B2E14;
  --dsw-alias-border-l2:#0B1B2E24;
  --dsw-alias-border-l2-darkmode-thin:#0B1B2E24;
  --dsw-alias-border-l3:#0B1B2E2E;
  --dsw-alias-border-l4:#0B1B2E3D;
  --dsw-alias-bg-skeleton:#0B1B2E12;
  --dsw-alias-bg-mask-1:#070F1A3D;
  --dsw-alias-bg-mask-2:#070F1A1F;
  --dsw-alias-bg-mask-3:#070F1A7A;
  --dsw-alias-bg-mask-photo:#070F1AE0;
  --dsw-alias-bg-mask-drop:#F7F9FCB3;
  --dsw-alias-button-tool-bar-fill:#454F6080;
  --dsw-alias-button-tool-bar-hover:#454F6099;
  --dsw-alias-button-tool-bar-fill-invisible:#0B11195C;
  /* 悬停蒙层改回中性墨色：悬停是「按下去一点」，不是「蓝一下」。品牌蓝只留给
     强调态的悬停（hover-accent）。 */
  --dsw-alias-interactive-bg-hover:#0B1B2E0F;
  --dsw-alias-interactive-bg-active:#0B1B2E1A;
  --dsw-alias-interactive-bg-hover-accent:#1B5FC12E;
  --dsw-alias-interactive-bg-hover-danger:#C43A4514;
  /* 产品唯一一处写死的品牌蓝。 */
  --dsw-alias-brand-primary-new-colorprimary-new-color:#1B5FC1;

  /* ── 排版：基础字体也是变量，所以字族不用碰任何选择器 ─────────────── */
  /* 几何无衬线。蔚来的身份在色与留白，不在字——所以这里不发明字体。 */
  --dsw-font-family: "Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  --dsw-font-markdown-h1-font-family: var(--dsw-font-family);
  --dsw-font-markdown-h2-font-family: var(--dsw-font-family);
  --dsw-font-markdown-h3-font-family: var(--dsw-font-family);
  --dsw-font-markdown-h4-font-family: var(--dsw-font-family);
  --dsw-font-markdown-h1-font-weight:700;
  --dsw-font-markdown-h2-font-weight:700;
  --dsw-font-markdown-h3-font-weight:700;
  --dsw-font-markdown-h4-font-weight:600;
}

/* ── 深色：色阶共用，只有 bluish-60 在产品里两套取值不同 ─────────────── */
html body[data-ds-dark-theme] {
  --dsw-static-neutral-bluish-60:#F2F5F9;

  --dsw-alias-border-l1:#E8EFFA14;
  --dsw-alias-border-l2:#E8EFFA24;
  --dsw-alias-border-l2-darkmode-thin:#E8EFFA14;
  --dsw-alias-border-l3:#E8EFFA33;
  --dsw-alias-border-l4:#E8EFFA42;
  --dsw-alias-border-inverted:#E8EFFA14;
  --dsw-alias-border-inverted2:#E8EFFA1F;
  --dsw-alias-bg-skeleton:#E8EFFA1A;
  --dsw-alias-bg-mask-1:#00000080;
  --dsw-alias-bg-mask-2:#00000033;
  --dsw-alias-bg-mask-3:#0000007A;
  --dsw-alias-bg-mask-photo:#000000E0;
  --dsw-alias-bg-mask-drop:#101722B3;
  --dsw-alias-interactive-bg-hover:#E8EFFA14;
  --dsw-alias-interactive-bg-active:#E8EFFA24;
  --dsw-alias-interactive-bg-hover-accent:#6C9BDC3D;
  --dsw-alias-interactive-bg-hover-danger:#D57B8026;
}

/* ── 天光 ──────────────────────────────────────────────────────────────
 * 视口顶部一层极淡的天光，向下三分之一处化开——天在上、地在下的那点意思，用光
 * 而不是用图形说。深色下换成座舱氛围灯。
 * 5% / 7% 的透明度：单看几乎看不见，但它给整块平面一个光源方向，否则深色模式会是
 * 一块死板的平色。pointer-events:none 保证它不吃任何点击。
 * 产品没有占用 body::after，所以这个位置是空的。
 * -------------------------------------------------------------------- */
html body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
  background-image: linear-gradient(180deg, rgba(27,95,193,.05) 0%, rgba(27,95,193,0) 32%);
}
html body[data-ds-dark-theme]::after {
  background-image: linear-gradient(180deg, rgba(108,155,220,.07) 0%, rgba(108,155,220,0) 34%);
}
`

    /** The one DOM node this skin owns; null until installed. */
    let styleElement = null

    /**
     * Install the skin stylesheet into document.head.
     *
     * The element is held in a module-local so a re-apply reuses it instead of
     * stacking a second copy, and the fiber disposer removes exactly this node.
     *
     * @returns the installed element, or null when the document has no head yet.
     */
    function installStyles() {
      if (styleElement !== null) return styleElement
      if (typeof document === 'undefined' || document.head === null) return null
      const element = document.createElement('style')
      element.id = 'dsh-unknowcao-skin'
      element.textContent = SKIN_CSS
      document.head.appendChild(element)
      styleElement = element
      return element
    }

    /* ═══════════════════════════════════════════════════════════════════════
     * 品牌层：GUI 上显示的品牌字样。
     *
     * 三个槽都是 `single`：注册即遮蔽产品自带的占用者（侧栏的鲸鱼 + 官方字标），
     * 卸载即还原。`conversation.hero.brand.mark` 目前是空的——官方构建把它留给声明
     * 方自己的动画鱼兜底，所以那一个是我们填进去，不是我们替换掉。
     *
     * 不想换品牌就把 BRAND 设成 null，颜色 / 排版 / 天光三层照常工作。
     * ═══════════════════════════════════════════════════════════════════════ */
    /**
     * 品牌名。产品原文是「DeepSeek Harness」——品牌词换成自己的，产品词「Harness」
     * 保留。只想要品牌本身就把 name 改成 'UnknowCao'。
     */
    const BRAND = { name: 'UnknowCao Harness', seal: 'U' }
    /**
     * 浏览器标签页标题。产品的外壳 HTML 写死了 `<title>DeepSeek Harness</title>`，但
     * 前端 bundle 现在**也会**写它：AppFrame 里那个 DocumentTitle 组件
     * （dsh-client-ui-layout）每逢会话标题变化就写一次
     * `document.title = `${title} — DeepSeek Harness``。所以这一处必须由皮肤**持有**，
     * 写一次是不够的——见下方 apply 里的访问器接管。取值直接跟随品牌名，两处不会各自漂。
     */
    const DOCUMENT_TITLE = BRAND.name
    /**
     * 标记：一块「天 — 地平线 — 地」的方印。渐变在 56%/57% 处硬切，那条硬边就是
     * 地平线；上半天蓝、下半深蓝。颜色同样压过彩度，和整套色阶同一个语速。
     */
    const MARK_SKY = 'linear-gradient(180deg, #7FA9DE 0%, #2F6BB8 56%, #1B4A86 57%, #14335C 100%)'
    /** 印面文字色，取浅色下的近白。 */
    const MARK_INK = '#F7F9FC'

    /**
     * 侧栏品牌名。这个槽的 owner props 是空对象——占用者自带宽高与内容，所以这里
     * 只给文字本身的样式，不接管任何布局。
     *
     * @returns the wordmark as text.
     */
    function BrandName() {
      return React.createElement('span', {
        style: {
          fontFamily: 'inherit',
          fontSize: '15px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          color: 'var(--dsw-alias-label-primary)',
        },
      }, BRAND.name)
    }

    /**
     * 品牌标记。侧栏给 `{ size }`，首页 hero 给 `{ size, className }`——className 是
     * 宿主用来保留周围标记几何的类，必须透传，否则折叠栏与标题行的对齐会散。
     *
     * @param {{ size?: number, className?: string }} props - host-supplied geometry.
     * @returns the sky-and-horizon mark.
     */
    function BrandMark(props = {}) {
      const size = typeof props.size === 'number' && props.size > 0 ? props.size : 18
      return React.createElement('span', {
        className: props.className,
        'aria-hidden': 'true',
        style: {
          boxSizing: 'border-box',
          width: `${size}px`,
          height: `${size}px`,
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: MARK_SKY,
          color: MARK_INK,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.24)',
          borderRadius: `${Math.max(3, Math.round(size * 0.26))}px`,
          fontSize: `${Math.round(size * 0.56)}px`,
          fontWeight: 600,
          lineHeight: 1,
          userSelect: 'none',
        },
      }, BRAND.seal)
    }

    /** The brand slots this skin occupies, in registration order. */
    const BRAND_SLOTS = [
      ['sidebar.brand.name', BrandName],
      ['sidebar.brand.mark', BrandMark],
      ['conversation.hero.brand.mark', BrandMark],
    ]

    return {
      name: 'dsh-unknowcao-skin',
      // Both are hard dependencies: with no theme registry the contract layer has
      // nowhere to go, and with no slot registry the brand layer cannot register.
      // Cordis holds the plugin until they exist rather than applying into a no-op.
      inject: ['theme', 'slots'],
      apply(ctx) {
        const styles = installStyles()
        if (styles !== null) {
          ctx.effect(() => () => {
            if (styles.parentNode !== null) styles.parentNode.removeChild(styles)
            styleElement = null
          }, 'dsh-unknowcao-skin: 皮肤样式表')
        }
        // Contract layer. The layer identity is the package name, so a re-apply
        // (HMR, row restart) replaces this layer instead of stacking sky on sky;
        // the disposer is what makes unloading restore the palette.
        ctx.effect(
          () => ctx.theme.overrideTokens('dsh-unknowcao-skin', ALIAS_TOKENS),
          'dsh-unknowcao-skin: 蔚来契约层',
        )
        // Brand layer. `slots.inject` waits for each declaration, so registration
        // lands at the right lifetime and collapses with the slot; the effect hands
        // the disposer to this fiber, which is what puts the product's own mark and
        // wordmark back when the skin unloads.
        if (BRAND !== null) {
          // 页面标题要「持有」，不能只写一次：产品的 AppFrame 会渲染一个 DocumentTitle
          // （dsh-client-ui-layout），它每逢会话标题变化就重写 `document.title`。原先那
          // 一次赋值会被它随后的写入覆盖，于是会话标题一生成，标签页就变成
          // 「会话标题 — DeepSeek Harness」。这里接管 document 的 title 访问器：产品写
          // 进来的值被丢弃，<title> 恒为品牌名。第一次写入仍走产品自己的访问器，落到
          // 元素上的就是同一个值；卸载时删掉这层影子属性再还原标题。
          if (typeof document !== 'undefined') {
            const previousTitle = document.title
            const ownDescriptor = Object.getOwnPropertyDescriptor(document, 'title')
            const held = {
              configurable: true,
              get: () => DOCUMENT_TITLE,
              // 产品写进来的值被丢弃：持有期间 <title> 只属于品牌名。
              set: () => {},
            }
            document.title = DOCUMENT_TITLE
            Object.defineProperty(document, 'title', held)
            ctx.effect(() => () => {
              // HMR 重挂时后来者可能已经接管；只有自己还是主人时才拆，免得把新的拆掉。
              if (Object.getOwnPropertyDescriptor(document, 'title')?.get !== held.get) return
              if (ownDescriptor === undefined) delete document.title
              else Object.defineProperty(document, 'title', ownDescriptor)
              document.title = previousTitle
            }, 'dsh-unknowcao-skin: 页面标题')
          }
          for (const [key, component] of BRAND_SLOTS) {
            ctx.effect(
              () => ctx.slots.inject(key, () => ctx.slots.register({ name: key }, component)),
              `dsh-unknowcao-skin: 品牌槽 ${key}`,
            )
          }
        }
      },
    }
  },
})
