/**
 * 轻量 Markdown → HTML 转换器
 * 专为微信小程序 <rich-text> 组件设计，无任何外部依赖
 *
 * 支持：
 *   # ~ ###  标题
 *   **text**  加粗
 *   *text*    斜体
 *   `code`    行内代码
 *   - / * / + 无序列表
 *   1. 2. 3.  有序列表
 *   ---       分割线
 *   空行      段落分隔
 */

/**
 * 处理行内格式（加粗、斜体、行内代码）
 * 注意：先转义 HTML 实体，再替换格式符，避免 XSS
 */
function inline(text) {
  return text
    // 1. 转义 HTML 特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 2. 行内代码（优先，防止内部 * _ 被误处理）
    .replace(/`([^`]+)`/g,
      '<code style="background:#f0f2f5;padding:2px 6px;border-radius:4px;font-size:0.88em;font-family:monospace;">$1</code>')
    // 3. 加粗
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    // 4. 斜体（不匹配已处理的 **）
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
}

/**
 * 将 Markdown 字符串转换为 HTML 字符串
 * @param {string} md - Markdown 原文
 * @returns {string} HTML 字符串（供 <rich-text nodes="..."> 使用）
 */
function mdToHtml(md) {
  if (!md || typeof md !== 'string') return ''

  // 统一换行符
  const lines = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let html = ''
  let inUl = false   // 是否在无序列表中
  let inOl = false   // 是否在有序列表中
  let pLines = []    // 当前段落行缓冲

  // 将缓冲的段落行刷出为 <p>
  function flushP() {
    if (pLines.length === 0) return
    html += '<p style="margin:4px 0;line-height:1.8;">' +
      pLines.join('<br/>') +
      '</p>'
    pLines = []
  }

  // 关闭列表
  function closeList() {
    if (inUl) { html += '</ul>'; inUl = false }
    if (inOl) { html += '</ol>'; inOl = false }
  }

  const H_SIZES = ['1.45em', '1.25em', '1.1em', '1em', '1em', '1em']

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // ── 标题 ──────────────────────────────────────────────
    const hm = line.match(/^(#{1,6})\s+(.+)$/)
    if (hm) {
      flushP(); closeList()
      const lv = hm[1].length
      html += `<h${lv} style="font-size:${H_SIZES[lv - 1]};font-weight:700;` +
        `margin:10px 0 4px;line-height:1.4;color:#1a2d47;">${inline(hm[2])}</h${lv}>`
      continue
    }

    // ── 分割线 ────────────────────────────────────────────
    if (/^[-*_]{3,}\s*$/.test(line)) {
      flushP(); closeList()
      html += '<hr style="border:none;border-top:1px solid #e8edf5;margin:10px 0;"/>'
      continue
    }

    // ── 无序列表 ──────────────────────────────────────────
    const ulm = line.match(/^\s*[-*+]\s+(.+)$/)
    if (ulm) {
      flushP()
      if (inOl) { html += '</ol>'; inOl = false }
      if (!inUl) {
        html += '<ul style="padding-left:1.4em;margin:4px 0;">'
        inUl = true
      }
      html += `<li style="margin:3px 0;line-height:1.7;">${inline(ulm[1])}</li>`
      continue
    }

    // ── 有序列表 ──────────────────────────────────────────
    const olm = line.match(/^\s*(\d+)[.)]\s+(.+)$/)
    if (olm) {
      flushP()
      if (inUl) { html += '</ul>'; inUl = false }
      if (!inOl) {
        html += '<ol style="padding-left:1.4em;margin:4px 0;">'
        inOl = true
      }
      html += `<li style="margin:3px 0;line-height:1.7;">${inline(olm[2])}</li>`
      continue
    }

    // ── 空行：段落分隔 ────────────────────────────────────
    if (line.trim() === '') {
      flushP(); closeList()
      continue
    }

    // ── 普通文本行：追加到段落缓冲 ───────────────────────
    closeList()
    pLines.push(inline(line))
  }

  // 收尾
  flushP()
  closeList()

  return html
}

module.exports = { mdToHtml }
