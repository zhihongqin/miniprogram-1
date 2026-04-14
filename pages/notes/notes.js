const api = require('../../utils/api')
const { showToast, formatRelativeTime } = require('../../utils/util')

Page({
  data: {
    items: [],
    loading: false,
    hasMore: true,
    pageNum: 1,
    total: 0
  },

  onLoad() {
    this.loadNotes(true)
  },

  onPullDownRefresh() {
    this.loadNotes(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadNotes(false)
    }
  },

  async loadNotes(reset = false) {
    if (this.data.loading) return
    const pageNum = reset ? 1 : this.data.pageNum
    this.setData({ loading: true })

    try {
      const result = await api.getMyCaseNotes(pageNum, 10)
      const raw = result.records || []
      const newItems = raw.map((row) => ({
        ...row,
        _timeAgo: row.updatedAt ? formatRelativeTime(row.updatedAt) : ''
      }))

      const items = reset ? newItems : [...this.data.items, ...newItems]
      this.setData({
        items,
        pageNum: reset ? 2 : pageNum + 1,
        total: result.total || 0,
        hasMore: items.length < (result.total || 0),
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      showToast(err.message || '加载失败')
    }
  },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
    }
  }
})
