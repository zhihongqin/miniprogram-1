// API 请求封装
// 开发环境：使用本地后端地址（需在微信开发者工具中关闭域名校验）
// 生产环境：替换为已备案的 HTTPS 域名
const BASE_URL = 'http://localhost:8080/api'

/**
 * 清除对象中值为 null / undefined / '' 的字段。
 * 微信小程序 wx.request 会把 undefined 序列化成字符串 "undefined" 发送，
 * 必须在发送前手动剔除，否则后端类型转换会报错。
 */
function cleanParams(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data
  const result = {}
  Object.keys(data).forEach(key => {
    const val = data[key]
    if (val !== undefined && val !== null && val !== '') {
      result[key] = val
    }
  })
  return result
}

/**
 * 通用请求方法
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    }
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }

    // GET/DELETE 请求的 query 参数需要清洗；POST/PUT 的 body 数组不清洗
    const method = options.method || 'GET'
    const data = (method === 'GET' || method === 'DELETE')
      ? cleanParams(options.data)
      : options.data

    wx.request({
      url: BASE_URL + options.url,
      method,
      data,
      header,
      success: (res) => {
        if (res.statusCode === 200) {
          const data = res.data
          if (data.code === 200 || data.code === 0) {
            resolve(data.data)
          } else if (data.code === 401) {
            // Token 失效，清除登录状态
            wx.removeStorageSync('token')
            wx.removeStorageSync('userInfo')
            const app = getApp()
            if (app) {
              app.globalData.token = null
              app.globalData.userInfo = null
            }
            // 非登录页时自动跳转
            const pages = getCurrentPages()
            const currentPage = pages[pages.length - 1]
            const route = currentPage ? currentPage.route : ''
            if (route && !route.includes('login')) {
              wx.navigateTo({ url: '/pages/login/login' })
            }
            reject({ code: 401, message: '请先登录' })
          } else {
            reject({ code: data.code, message: data.message || '请求失败' })
          }
        } else {
          reject({ code: res.statusCode, message: '网络请求失败' })
        }
      },
      fail: (err) => {
        reject({ code: -1, message: '网络连接失败，请检查网络' })
      }
    })
  })
}

// ─── 认证接口 ───────────────────────────────────────────────────────────────

/** 微信登录 */
function wxLogin(data) {
  return request({ url: '/auth/wx-login', method: 'POST', data })
}

// ─── 用户接口 ───────────────────────────────────────────────────────────────

/** 获取当前用户信息 */
function getUserInfo() {
  return request({ url: '/user/info', method: 'GET' })
}

/** 更新当前用户信息（nickname、avatarUrl 均为可选 Query 参数） */
function updateUserInfo(params) {
  return request({ url: '/user/info', method: 'PUT', data: params })
}

// ─── 案例接口 ───────────────────────────────────────────────────────────────

/** 分页查询案例列表 */
function queryCases(params) {
  return request({ url: '/cases', method: 'GET', data: params })
}

/** 热门搜索词（公开） */
function getHotKeywords(limit = 10) {
  return request({ url: '/cases/hot-keywords', method: 'GET', data: { limit } })
}

/** 获取案例详情 */
function getCaseDetail(id) {
  return request({ url: `/cases/${id}`, method: 'GET' })
}

/** 收藏/取消收藏 */
function toggleFavorite(id) {
  return request({ url: `/cases/${id}/favorite`, method: 'POST' })
}

/** 获取我的收藏列表 */
function getFavorites(pageNum = 1, pageSize = 10) {
  return request({ url: '/cases/favorites', method: 'GET', data: { pageNum, pageSize } })
}

/** 获取浏览记录 */
function getBrowseHistory(pageNum = 1, pageSize = 20) {
  return request({ url: '/cases/browse-history', method: 'GET', data: { pageNum, pageSize } })
}

/** 删除浏览记录 */
function deleteBrowseHistory(ids) {
  return request({ url: '/cases/browse-history', method: 'DELETE', data: ids })
}

// ─── 智能问答接口 ─────────────────────────────────────────────────────────────

/**
 * 智能法律问答（经后端代理转发至 FastGPT）
 * @param {string} question - 用户提问内容
 * @param {string} chatId   - 会话 ID，用于保持多轮上下文
 */
function askLegalQuestion(question, chatId) {
  return request({
    url: '/chat/ask',
    method: 'POST',
    data: { question, chatId }
  })
}

module.exports = {
  BASE_URL,
  request,
  wxLogin,
  getUserInfo,
  updateUserInfo,
  queryCases,
  getHotKeywords,
  getCaseDetail,
  toggleFavorite,
  getFavorites,
  getBrowseHistory,
  deleteBrowseHistory,
  askLegalQuestion
}
