const api = require('../../utils/api')
const { showToast } = require('../../utils/util')

function buildClientInfo() {
  try {
    const sys = wx.getSystemInfoSync()
    const parts = [
      sys.SDKVersion && `基础库 ${sys.SDKVersion}`,
      sys.model,
      sys.system
    ].filter(Boolean)
    return parts.join(' · ')
  } catch (e) {
    return ''
  }
}

Page({
  data: {
    content: '',
    contact: '',
    submitting: false,
    contentLen: 0
  },

  onLoad() {
    const app = getApp()
    if (!app.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '反馈功能需要登录，是否前往登录？',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/login/login' })
          else wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/profile' }) })
        }
      })
    }
  },

  onContentInput(e) {
    const v = e.detail.value || ''
    this.setData({ content: v, contentLen: v.length })
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value || '' })
  },

  async onSubmit() {
    const app = getApp()
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    const text = (this.data.content || '').trim()
    if (!text) {
      showToast('请填写反馈内容')
      return
    }
    if (text.length > 2000) {
      showToast('反馈内容不能超过2000字')
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      const payload = { content: text }
      const c = (this.data.contact || '').trim()
      if (c) payload.contact = c
      const clientInfo = buildClientInfo()
      if (clientInfo) payload.clientInfo = clientInfo
      await api.submitFeedback(payload)
      showToast('提交成功，感谢反馈', 'success')
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (err) {
      showToast(err.message || '提交失败')
    } finally {
      this.setData({ submitting: false })
    }
  }
})
