const api = require('../../utils/api')
const { getCaseTypeName, getCaseTypeColor, getScoreLevel, showToast } = require('../../utils/util')

const CASE_TYPES = [
  { label: '全部', value: null },
  { label: '民事', value: 1 },
  { label: '刑事', value: 2 },
  { label: '行政', value: 3 },
  { label: '商事', value: 4 }
]

const ORDER_OPTIONS = [
  { label: '最新入库', value: 'created_at' },
  { label: '重要性', value: 'importance_score' },
  { label: '浏览量', value: 'view_count' },
  { label: '判决日期', value: 'judgment_date' }
]

Page({
  data: {
    cases: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    pageNum: 1,
    pageSize: 10,
    total: 0,

    keyword: '',
    selectedType: null,
    selectedOrder: 'created_at',
    caseTypes: CASE_TYPES,
    orderOptions: ORDER_OPTIONS,
    showOrderPicker: false,

    // 辅助函数
    getCaseTypeName,
    getCaseTypeColor,
    getScoreLevel
  },

  onLoad() {
    this.loadCases(true)
  },

  onPullDownRefresh() {
    this.loadCases(true, true)
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadCases(false)
    }
  },

  onShow() {
    // 每次显示时刷新（处理收藏状态变化）
    if (this.data.cases.length > 0) {
      this.loadCases(true)
    }
  },

  async loadCases(reset = false, isPullDown = false) {
    if (this.data.loading) return

    const pageNum = reset ? 1 : this.data.pageNum
    this.setData({ loading: true })

    try {
      const result = await api.queryCases({
        keyword: this.data.keyword,        // cleanParams 会自动过滤空字符串
        caseType: this.data.selectedType,  // cleanParams 会自动过滤 null
        orderBy: this.data.selectedOrder,
        orderDir: 'desc',
        pageNum,
        pageSize: this.data.pageSize
      })

      // CaseListVO 字段：id/titleZh/titleEn/caseType/country/importanceScore/aiStatus/viewCount/favoriteCount/isFavorited
      const newCases = (result.records || []).map(c => ({
        ...c,
        _typeName: getCaseTypeName(c.caseType),
        _typeColor: getCaseTypeColor(c.caseType),
        _scoreLevel: getScoreLevel(c.importanceScore)
      }))

      const cases = reset ? newCases : [...this.data.cases, ...newCases]
      const hasMore = cases.length < (result.total || 0)

      this.setData({
        cases,
        pageNum: reset ? 2 : pageNum + 1,
        total: result.total || 0,
        hasMore,
        loading: false,
        refreshing: false
      })
    } catch (err) {
      this.setData({ loading: false, refreshing: false })
      showToast(err.message || '加载失败')
    } finally {
      if (isPullDown) wx.stopPullDownRefresh()
    }
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.loadCases(true)
  },

  onClearKeyword() {
    this.setData({ keyword: '' })
    this.loadCases(true)
  },

  onSelectType(e) {
    const value = e.currentTarget.dataset.value
    this.setData({ selectedType: value })
    this.loadCases(true)
  },

  onToggleOrderPicker() {
    this.setData({ showOrderPicker: !this.data.showOrderPicker })
  },

  onSelectOrder(e) {
    const value = e.currentTarget.dataset.value
    this.setData({ selectedOrder: value, showOrderPicker: false })
    this.loadCases(true)
  },

  onTapCase(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  onTapSearch() {
    wx.switchTab({ url: '/pages/search/search' })
  },

  getCurrentOrderLabel() {
    const opt = ORDER_OPTIONS.find(o => o.value === this.data.selectedOrder)
    return opt ? opt.label : '排序'
  }
})
