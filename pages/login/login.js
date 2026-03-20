const { showToast, showLoading, hideLoading } = require('../../utils/util')

Page({
  data: {
    loading: false,
    nickname: '',
    avatarUrl: '',
    hasProfile: false,
    defaultAvatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
  },

  onLoad() {
    // 如果已登录，直接返回
    const app = getApp()
    if (app.isLoggedIn()) {
      wx.navigateBack()
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({
      avatarUrl,
      hasProfile: !!(avatarUrl && this.data.nickname)
    })
  },

  onNicknameInput(e) {
    const nickname = e.detail.value
    this.setData({
      nickname,
      hasProfile: !!(nickname && this.data.avatarUrl)
    })
  },

  async onLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })
    showLoading('登录中...')

    try {
      const app = getApp()
      await app.doLogin({
        nickname: this.data.nickname,
        avatarUrl: this.data.avatarUrl
      })

      hideLoading()
      showToast('登录成功', 'success')

      setTimeout(() => {
        const pages = getCurrentPages()
        if (pages.length > 1) {
          wx.navigateBack()
        } else {
          wx.switchTab({ url: '/pages/home/home' })
        }
      }, 800)
    } catch (err) {
      hideLoading()
      this.setData({ loading: false })
      showToast(err.message || '登录失败，请重试')
    }
  },

  onSkip() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/home/home' })
    }
  }
})
