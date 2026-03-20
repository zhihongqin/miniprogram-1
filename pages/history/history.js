const api = require('../../utils/api')
const { formatRelativeTime, showToast } = require('../../utils/util')

Page({
  data: {
    records: [],
    loading: false,
    hasMore: true,
    pageNum: 1,
    total: 0,
    editMode: false,
    selectedIds: []   // 存浏览记录 id（Number），用于批量删除
  },

  onLoad() {
    this.loadHistory(true)
  },

  onPullDownRefresh() {
    this.loadHistory(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadHistory(false)
    }
  },

  async loadHistory(reset = false) {
    if (this.data.loading) return
    const pageNum = reset ? 1 : this.data.pageNum
    this.setData({ loading: true })

    try {
      const result = await api.getBrowseHistory(pageNum, 20)
      // BrowseHistoryVO 字段：id / caseId / titleZh / titleEn / createdAt
      const newRecords = (result.records || []).map(r => ({
        ...r,
        _timeStr: formatRelativeTime(r.createdAt)
      }))

      const records = reset ? newRecords : [...this.data.records, ...newRecords]
      this.setData({
        records,
        pageNum: reset ? 2 : pageNum + 1,
        total: result.total || 0,
        hasMore: records.length < (result.total || 0),
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      showToast(err.message || '加载失败')
    }
  },

  onTapRecord(e) {
    if (this.data.editMode) {
      // 编辑模式：用浏览记录 id（Number）做选中，统一转为 Number 比较
      const recordId = Number(e.currentTarget.dataset.recordId)
      const selectedIds = [...this.data.selectedIds]
      const idx = selectedIds.indexOf(recordId)
      if (idx >= 0) {
        selectedIds.splice(idx, 1)
      } else {
        selectedIds.push(recordId)
      }
      this.setData({ selectedIds })
      return
    }
    // 正常模式：用案例 id 跳转详情
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  onToggleEdit() {
    this.setData({
      editMode: !this.data.editMode,
      selectedIds: []
    })
  },

  async onDeleteSelected() {
    if (this.data.selectedIds.length === 0) {
      showToast('请先选择要删除的记录')
      return
    }

    wx.showModal({
      title: '删除记录',
      content: `确定删除选中的 ${this.data.selectedIds.length} 条记录？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            // 后端接收浏览记录 id 列表（Long[]）
            await api.deleteBrowseHistory(this.data.selectedIds)
            const deletedCount = this.data.selectedIds.length
            const records = this.data.records.filter(
              r => !this.data.selectedIds.includes(r.id)
            )
            this.setData({
              records,
              selectedIds: [],
              editMode: false,
              total: Math.max(this.data.total - deletedCount, 0)
            })
            showToast('删除成功')
          } catch (err) {
            showToast(err.message || '删除失败')
          }
        }
      }
    })
  }
})
