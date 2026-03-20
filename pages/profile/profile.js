const api = require('../../utils/api')
const { showToast } = require('../../utils/util')

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    favoriteCount: 0,
    historyCount: 0
  },

  onShow() {
    const app = getApp()
    const isLoggedIn = app.isLoggedIn()
    const userInfo = app.globalData.userInfo

    this.setData({ isLoggedIn, userInfo })

    if (isLoggedIn) {
      // 从服务端同步最新用户信息（GET /user/info）
      this.syncUserInfo()
      this.loadCounts()
    }
  },

  async syncUserInfo() {
    try {
      const userInfo = await api.getUserInfo()
      const app = getApp()
      // 保留 token，更新其他字段
      const merged = { ...app.globalData.userInfo, ...userInfo }
      app.globalData.userInfo = merged
      wx.setStorageSync('userInfo', merged)
      this.setData({ userInfo: merged })
    } catch (e) {
      // 静默失败，不影响页面展示
    }
  },

  async loadCounts() {
    try {
      const [favResult, histResult] = await Promise.all([
        api.getFavorites(1, 1),
        api.getBrowseHistory(1, 1)
      ])
      this.setData({
        favoriteCount: favResult.total || 0,
        historyCount: histResult.total || 0
      })
    } catch (e) {
      // 静默失败
    }
  },

  onTapLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onTapFavorites() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    wx.navigateTo({ url: '/pages/favorites/favorites' })
  },

  onTapHistory() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    wx.navigateTo({ url: '/pages/history/history' })
  },

  onTapLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          getApp().logout()
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            favoriteCount: 0,
            historyCount: 0
          })
          showToast('已退出登录')
        }
      }
    })
  },

  onTapAbout() {
    wx.showModal({
      title: '关于本系统',
      content: '涉外法律案例查询系统\n\n收录来自全球主要司法机构的涉外法律案例，提供中英双语展示、AI智能摘要与重要性评分，助力法律研究与实务参考。',
      showCancel: false
    })
  }
})
