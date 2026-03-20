/**
 * 格式化时间
 */
function formatTime(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = d.getHours()
  const minute = d.getMinutes()
  const second = d.getSeconds()
  return [year, month, day].map(formatNumber).join('/') + ' ' +
    [hour, minute, second].map(formatNumber).join(':')
}

/**
 * 格式化日期（仅年月日）
 * 兼容后端返回的 LocalDate（yyyy-MM-dd）和 LocalDateTime（yyyy-MM-dd HH:mm:ss）格式
 */
function formatDate(dateStr) {
  if (!dateStr) return ''
  // 已经是 yyyy-MM-dd 格式直接返回
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const date = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(date.getTime())) return dateStr
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}-${formatNumber(month)}-${formatNumber(day)}`
}

/**
 * 格式化相对时间（如：3天前）
 * 兼容后端返回的 yyyy-MM-dd HH:mm:ss 格式
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr.replace(' ', 'T'))
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (years > 0) return `${years}年前`
  if (months > 0) return `${months}个月前`
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

function formatNumber(n) {
  n = n.toString()
  return n[1] ? n : '0' + n
}

/**
 * 案件类型映射
 */
const CASE_TYPE_MAP = {
  1: '民事',
  2: '刑事',
  3: '行政',
  4: '商事'
}

/**
 * 案件类型颜色映射
 */
const CASE_TYPE_COLOR = {
  1: '#4A90D9',
  2: '#E74C3C',
  3: '#F39C12',
  4: '#27AE60'
}

function getCaseTypeName(type) {
  return CASE_TYPE_MAP[type] || '其他'
}

function getCaseTypeColor(type) {
  return CASE_TYPE_COLOR[type] || '#999'
}

/**
 * 重要性评分等级
 */
function getScoreLevel(score) {
  if (!score) return { label: '未评分', color: '#999' }
  if (score >= 90) return { label: '极高', color: '#E74C3C' }
  if (score >= 75) return { label: '高', color: '#F39C12' }
  if (score >= 60) return { label: '中', color: '#27AE60' }
  return { label: '低', color: '#999' }
}

/**
 * 截断文本
 */
function truncate(str, maxLen = 100) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.substring(0, maxLen) + '...'
}

/**
 * 显示 Toast 提示
 */
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration })
}

/**
 * 显示加载中
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

/**
 * 隐藏加载中
 */
function hideLoading() {
  wx.hideLoading()
}

module.exports = {
  formatTime,
  formatDate,
  formatRelativeTime,
  formatNumber,
  CASE_TYPE_MAP,
  CASE_TYPE_COLOR,
  getCaseTypeName,
  getCaseTypeColor,
  getScoreLevel,
  truncate,
  showToast,
  showLoading,
  hideLoading
}
