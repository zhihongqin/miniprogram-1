// app.js
const api = require('./utils/api')

App({
  onLaunch() {
    // 读取本地缓存的登录信息
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
    }
  },

  /**
   * 执行微信登录并与后端对接
   * @param {Object} options - 可选参数
   * @param {string} options.nickname - 用户昵称
   * @param {string} options.avatarUrl - 头像URL
   * @returns {Promise}
   */
  doLogin(options = {}) {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          if (!res.code) {
            reject(new Error('微信登录失败'))
            return
          }
          try {
            const userVO = await api.wxLogin({
              code: res.code,
              nickname: options.nickname || '',
              avatarUrl: options.avatarUrl || ''
            })
            this.globalData.token = userVO.token
            this.globalData.userInfo = userVO
            wx.setStorageSync('token', userVO.token)
            wx.setStorageSync('userInfo', userVO)
            resolve(userVO)
          } catch (err) {
            reject(err)
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  },

  /**
   * 退出登录
   */
  logout() {
    this.globalData.token = null
    this.globalData.userInfo = null
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
  },

  /**
   * 判断是否已登录
   */
  isLoggedIn() {
    return !!this.globalData.token
  },

  globalData: {
    token: null,
    userInfo: null
  }
})
