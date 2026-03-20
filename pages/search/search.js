const api = require('../../utils/api')
const { getCaseTypeName, getCaseTypeColor, getScoreLevel, showToast } = require('../../utils/util')

const CASE_TYPES = [
  { label: '全部类型', value: null },
  { label: '民事', value: 1 },
  { label: '刑事', value: 2 },
  { label: '行政', value: 3 },
  { label: '商事', value: 4 }
]

const ORDER_OPTIONS = [
  { label: '重要性', value: 'importance_score' },
  { label: '最新入库', value: 'created_at' },
  { label: '浏览量', value: 'view_count' },
  { label: '判决日期', value: 'judgment_date' }
]

const HOT_KEYWORDS = [
  '知识产权', '贸易争端', '投资仲裁', '合同纠纷', '反倾销',
  '制裁', '专利侵权', '商标', '海事', '劳动争议'
]

Page({
  data: {
    keyword: '',
    selectedType: null,
    selectedCountry: '',
    _selectedTypeName: '',
    selectedOrder: 'importance_score',
    selectedDir: 'desc',
    _selectedOrderLabel: '重要性',
    orderOptions: ORDER_OPTIONS,
    caseTypes: CASE_TYPES,
    hotKeywords: HOT_KEYWORDS,

    cases: [],
    loading: false,
    hasMore: true,
    pageNum: 1,
    total: 0,
    searched: false,

    showFilter: false
  },

  onLoad(options) {
    this.loadHotKeywords()
    if (options.keyword) {
      this.setData({ keyword: options.keyword })
      this.doSearch(true)
    }
  },

  async loadHotKeywords() {
    try {
      const keywords = await api.getHotKeywords(10)
      if (Array.isArray(keywords) && keywords.length > 0) {
        this.setData({ hotKeywords: keywords })
      }
    } catch (e) {
      // 接口失败时保留页面内置默认热词
    }
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore && this.data.searched) {
      this.doSearch(false)
    }
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    if (!this.data.keyword.trim() && !this.data.selectedType && !this.data.selectedCountry) {
      showToast('请输入搜索关键词')
      return
    }
    this.doSearch(true)
  },

  onClear() {
    this.setData({
      keyword: '',
      cases: [],
      searched: false,
      hasMore: true,
      pageNum: 1,
      total: 0
    })
  },

  onTapHotKeyword(e) {
    const kw = e.currentTarget.dataset.kw
    this.setData({ keyword: kw })
    this.doSearch(true)
  },

  onToggleFilter() {
    this.setData({ showFilter: !this.data.showFilter })
  },

  onSelectType(e) {
    const value = e.currentTarget.dataset.value
    const found = CASE_TYPES.find(t => t.value === value)
    this.setData({
      selectedType: value,
      _selectedTypeName: found ? found.label : ''
    })
  },

  onCountryInput(e) {
    this.setData({ selectedCountry: e.detail.value })
  },

  onApplyFilter() {
    this.setData({ showFilter: false })
    if (this.data.searched || this.data.keyword) {
      this.doSearch(true)
    }
  },

  onSelectOrder(e) {
    const value = e.currentTarget.dataset.value
    const found = ORDER_OPTIONS.find(o => o.value === value)
    this.setData({
      selectedOrder: value,
      _selectedOrderLabel: found ? found.label : ''
    })
  },

  onToggleDir() {
    this.setData({ selectedDir: this.data.selectedDir === 'desc' ? 'asc' : 'desc' })
  },

  onResetFilter() {
    this.setData({
      selectedType: null,
      selectedCountry: '',
      _selectedTypeName: '',
      selectedOrder: 'importance_score',
      selectedDir: 'desc',
      _selectedOrderLabel: '重要性'
    })
  },

  async doSearch(reset = false) {
    if (this.data.loading) return

    const pageNum = reset ? 1 : this.data.pageNum
    this.setData({ loading: true, searched: true })

    try {
      const result = await api.queryCases({
        keyword: this.data.keyword.trim(),        // cleanParams 会自动过滤空字符串
        caseType: this.data.selectedType,         // cleanParams 会自动过滤 null
        country: this.data.selectedCountry.trim(),// cleanParams 会自动过滤空字符串
        orderBy: this.data.selectedOrder,
        orderDir: this.data.selectedDir,
        pageNum,
        pageSize: 10
      })

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
      showToast(err.message || '搜索失败')
    }
  },

  onTapCase(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  }
})
