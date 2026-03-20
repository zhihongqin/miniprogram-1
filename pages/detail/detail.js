const api = require('../../utils/api')
const { getCaseTypeName, getCaseTypeColor, formatDate, getScoreLevel, showToast, showLoading, hideLoading } = require('../../utils/util')

Page({
  data: {
    caseDetail: null,
    loading: true,
    favoriting: false,
    showFullEn: false,
    activeTab: 'zh',  // zh / en / info
    id: null
  },

  onLoad(options) {
    const id = options.id
    this.setData({ id })
    this.loadDetail(id)
  },

  onShareAppMessage() {
    const detail = this.data.caseDetail
    return {
      title: detail ? (detail.titleZh || detail.titleEn) : '涉外法律案例',
      path: `/pages/detail/detail?id=${this.data.id}`
    }
  },

  async loadDetail(id) {
    showLoading()
    try {
      const detail = await api.getCaseDetail(id)
      const typeName = getCaseTypeName(detail.caseType)
      const typeColor = getCaseTypeColor(detail.caseType)
      const dateStr = formatDate(detail.judgmentDate)
      // importanceScore 来自 CaseListVO（0-100），用于顶部评分展示
      const scoreLevel = getScoreLevel(detail.importanceScore)
      // score 子对象字段：totalScore / legalValue / socialImpact / reasoning
      const score = detail.score || null

      this.setData({
        caseDetail: {
          ...detail,
          score,
          _typeName: typeName,
          _typeColor: typeColor,
          _dateStr: dateStr,
          _scoreLevel: scoreLevel
        },
        loading: false
      })
      wx.setNavigationBarTitle({ title: detail.titleZh || detail.titleEn || '案例详情' })
    } catch (err) {
      this.setData({ loading: false })
      showToast(err.message || '加载失败')
    } finally {
      hideLoading()
    }
  },

  onSwitchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  async onToggleFavorite() {
    const app = getApp()
    if (!app.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '收藏功能需要登录，是否前往登录？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' })
          }
        }
      })
      return
    }

    if (this.data.favoriting) return
    this.setData({ favoriting: true })

    try {
      const isFavorited = await api.toggleFavorite(this.data.id)
      const detail = this.data.caseDetail
      this.setData({
        caseDetail: {
          ...detail,
          isFavorited,
          favoriteCount: isFavorited
            ? (detail.favoriteCount || 0) + 1
            : Math.max((detail.favoriteCount || 0) - 1, 0)
        }
      })
      showToast(isFavorited ? '收藏成功' : '已取消收藏', 'success')
    } catch (err) {
      showToast(err.message || '操作失败')
    } finally {
      this.setData({ favoriting: false })
    }
  },

  onToggleFullEn() {
    this.setData({ showFullEn: !this.data.showFullEn })
  },

  onOpenSource() {
    const url = this.data.caseDetail?.url
    if (url) {
      wx.setClipboardData({
        data: url,
        success: () => showToast('链接已复制到剪贴板')
      })
    }
  }
})
