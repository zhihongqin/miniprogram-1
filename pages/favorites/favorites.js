const api = require('../../utils/api')
const { getCaseTypeName, getCaseTypeColor, getScoreLevel, showToast } = require('../../utils/util')

Page({
  data: {
    cases: [],
    loading: false,
    hasMore: true,
    pageNum: 1,
    total: 0
  },

  onLoad() {
    this.loadFavorites(true)
  },

  onPullDownRefresh() {
    this.loadFavorites(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadFavorites(false)
    }
  },

  async loadFavorites(reset = false) {
    if (this.data.loading) return
    const pageNum = reset ? 1 : this.data.pageNum
    this.setData({ loading: true })

    try {
      const result = await api.getFavorites(pageNum, 10)
      // CaseListVO 字段：id/titleZh/titleEn/caseType/country/importanceScore/aiStatus/viewCount/favoriteCount/isFavorited
      const newCases = (result.records || []).map(c => ({
        ...c,
        _typeName: getCaseTypeName(c.caseType),
        _typeColor: getCaseTypeColor(c.caseType),
        _scoreLevel: getScoreLevel(c.importanceScore)
      }))

      const cases = reset ? newCases : [...this.data.cases, ...newCases]
      this.setData({
        cases,
        pageNum: reset ? 2 : pageNum + 1,
        total: result.total || 0,
        hasMore: cases.length < (result.total || 0),
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      showToast(err.message || '加载失败')
    }
  },

  onTapCase(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  }
})
