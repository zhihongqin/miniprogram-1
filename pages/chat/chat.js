const api = require('../../utils/api')
const { showToast, formatRelativeTime } = require('../../utils/util')
const { mdToHtml } = require('../../utils/markdown')

const QUICK_QUESTIONS = [
  '劳动合同到期不续签，公司需要支付赔偿金吗？',
  '跨国合同对方违约，我该如何维权？'
]

Page({
  data: {
    // 登录态
    isLoggedIn: false,

    // 当前对话
    messages: [],
    inputText: '',
    loading: false,
    chatId: '',
    sessionTitle: '新对话',
    showQuickQuestions: true,
    quickQuestions: QUICK_QUESTIONS,
    scrollToId: '',

    // 历史面板
    showHistory: false,
    historyList: [],
    historyLoading: false,
    historyPage: 1,
    historyHasMore: true,

    // 输入框字符数
    inputLen: 0,

    /** 待发送的附件 { url, fileName }，发送成功后清空 */
    attachedFile: null
  },

  onLoad() {
    this._resetSession()
  },

  onShow() {
    const loggedIn = getApp().isLoggedIn()
    const wasLoggedIn = this.data.isLoggedIn
    this.setData({ isLoggedIn: loggedIn })

    if (loggedIn && !wasLoggedIn && this.data.messages.length === 0) {
      this._showWelcome()
    }
    if (loggedIn && this.data.messages.length === 0) {
      this._showWelcome()
    }
  },

  // ─── 登录 ────────────────────────────────────────────────────────────────────

  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  // ─── 新对话 ──────────────────────────────────────────────────────────────────

  onNewChat() {
    if (this.data.messages.length === 0) return
    wx.showModal({
      title: '开始新对话',
      content: '当前对话将保存在历史记录中，确定开始新对话？',
      confirmText: '确定',
      success: (res) => {
        if (res.confirm) {
          this._resetSession()
          this._showWelcome()
        }
      }
    })
  },

  _resetSession() {
    this.setData({
      messages: [],
      chatId: 'chat_' + Date.now(),
      sessionTitle: '新对话',
      showQuickQuestions: true,
      inputText: '',
      inputLen: 0,
      attachedFile: null
    })
  },

  _showWelcome() {
    if (this.data.messages.length > 0) return
    this._addAiMessage(
      '您好！我是法律智能助手。\n\n' 
    )
  },

  // ─── 历史面板 ────────────────────────────────────────────────────────────────

  onOpenHistory() {
    if (!this.data.isLoggedIn) {
      showToast('请先登录')
      return
    }
    this.setData({
      showHistory: true,
      historyList: [],
      historyPage: 1,
      historyHasMore: true
    })
    this._loadHistory()
  },

  onCloseHistory() {
    this.setData({ showHistory: false })
  },

  async _loadHistory(reset = false) {
    if (this.data.historyLoading) return
    if (!this.data.historyHasMore && !reset) return

    const page = reset ? 1 : this.data.historyPage
    this.setData({ historyLoading: true })

    try {
      const result = await api.getChatSessions(page, 20)
      const records = (result.records || []).map(s => ({
        ...s,
        _timeAgo: formatRelativeTime(s.updatedAt)
      }))
      const list = reset ? records : [...this.data.historyList, ...records]
      this.setData({
        historyList: list,
        historyPage: page + 1,
        historyHasMore: list.length < (result.total || 0),
        historyLoading: false
      })
    } catch (err) {
      this.setData({ historyLoading: false })
      showToast('加载历史失败')
    }
  },

  onHistoryScrollToLower() {
    this._loadHistory()
  },

  async onTapHistory(e) {
    const { chatId, title } = e.currentTarget.dataset
    this.setData({ showHistory: false, loading: true })
    wx.showLoading({ title: '加载中...' })

    try {
      const session = await api.getChatSessionDetail(chatId)
      const messages = (session.messages || []).map(m => {
        const role = m.role === 'assistant' ? 'ai' : 'user'
        return {
          id: 'msg_' + m.id,
          role,
          content: m.content,
          fileUrl: m.fileUrl || '',
          fileName: m.fileName || '',
          nodes: role === 'ai' ? mdToHtml(m.content) : '',
          time: m.createdAt ? m.createdAt.substring(11, 16) : '',
          thinking: false
        }
      })
      this.setData({
        chatId,
        sessionTitle: title || '历史对话',
        messages,
        showQuickQuestions: false,
        loading: false
      })
      wx.hideLoading()
      this._scrollToBottom()
    } catch (err) {
      wx.hideLoading()
      this.setData({ loading: false })
      showToast('加载会话失败')
    }
  },

  onDeleteHistory(e) {
    const { chatId, index } = e.currentTarget.dataset
    wx.showModal({
      title: '删除会话',
      content: '确定删除这条历史对话吗？',
      confirmText: '删除',
      confirmColor: '#e74c3c',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.deleteChatSession(chatId)
          const list = [...this.data.historyList]
          list.splice(index, 1)
          this.setData({ historyList: list })
          // 如果删除的是当前会话，重置
          if (this.data.chatId === chatId) {
            this._resetSession()
            this._showWelcome()
          }
          showToast('已删除', 'success')
        } catch (err) {
          showToast('删除失败')
        }
      }
    })
  },

  onUnload() {
    this._stopPolling()
  },

  // ─── 发送消息 ────────────────────────────────────────────────────────────────

  onInputChange(e) {
    const val = e.detail.value
    this.setData({ inputText: val, inputLen: val.length })
  },

  onTapQuickQuestion(e) {
    const question = e.currentTarget.dataset.q
    this._doSend(question)
  },

  onSend() {
    const text = this.data.inputText.trim()
    if (!text || this.data.loading) return
    this._doSend(text)
  },

  _ensureLoginForUpload() {
    if (this.data.isLoggedIn) return true
    wx.showModal({
      title: '请先登录',
      content: '上传附件需要登录，是否前往登录？',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) wx.navigateTo({ url: '/pages/login/login' })
      }
    })
    return false
  },

  onChooseImage() {
    if (!this._ensureLoginForUpload()) return
    if (this.data.loading) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const f = res.tempFiles && res.tempFiles[0]
        if (!f || !f.tempFilePath) return
        this._uploadChatFile(f.tempFilePath)
      }
    })
  },

  onChooseFile() {
    if (!this._ensureLoginForUpload()) return
    if (this.data.loading) return
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'doc', 'docx', 'txt'],
      success: (res) => {
        const f = res.tempFiles[0]
        if (!f) return
        this._uploadChatFile(f.path)
      }
    })
  },

  async _uploadChatFile(filePath) {
    wx.showLoading({ title: '上传中...', mask: true })
    try {
      const data = await api.uploadChatFile(filePath)
      this.setData({
        attachedFile: { url: data.url, fileName: data.fileName || '附件' }
      })
      showToast('附件已添加', 'success')
    } catch (err) {
      showToast((err && err.message) ? err.message : '上传失败')
    } finally {
      wx.hideLoading()
    }
  },

  onRemoveAttachment() {
    this.setData({ attachedFile: null })
  },

  onOpenAttachment(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.setClipboardData({
      data: url,
      success: () => showToast('附件链接已复制')
    })
  },

  async _doSend(text) {
    if (this.data.loading) return

    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '请先登录',
        content: '使用智能问答功能需要登录，是否前往登录？',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/login/login' })
        }
      })
      return
    }

    const attach = this.data.attachedFile
    this._addUserMessage(text, attach)
    const thinkingId = 'thinking_' + Date.now()
    this._thinkingId = thinkingId

    this.setData({
      inputText: '',
      inputLen: 0,
      loading: true,
      showQuickQuestions: false,
      sessionTitle: this.data.sessionTitle === '新对话'
        ? (text.length > 18 ? text.substring(0, 18) + '…' : text)
        : this.data.sessionTitle
    })
    this._addThinking(thinkingId)

    try {
      // 此接口现在快速返回 { taskId, chatId, status:"PENDING" }
      const result = await api.askLegalQuestion(
        text,
        this.data.chatId,
        attach ? attach.url : undefined,
        attach ? attach.fileName : undefined
      )
      if (result && result.taskId) {
        if (result.chatId) this.setData({ chatId: result.chatId })
        this._startPolling(result.taskId)
      } else {
        this._replaceThinking(thinkingId, '服务响应异常，请重试')
        this.setData({ loading: false })
        this._scrollToBottom()
      }
    } catch (err) {
      if (err && err.code === 401) {
        this._replaceThinking(thinkingId, '登录已过期，请重新登录后继续。')
        this.setData({ isLoggedIn: false, loading: false })
        setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 1500)
      } else {
        const msg = (err && err.message) ? err.message : '请求失败，请稍后重试'
        this._replaceThinking(thinkingId, `抱歉，${msg}`)
        this.setData({ loading: false })
      }
      this._scrollToBottom()
    }
  },

  // ─── 轮询逻辑 ────────────────────────────────────────────────────────────────

  /** 最多轮询 80 次 × 2.5 秒 = 200 秒 */
  _startPolling(taskId) {
    this._pollCount = 0
    this._stopPolling()
    this._poll(taskId)
  },

  _stopPolling() {
    if (this._pollTimer) {
      clearTimeout(this._pollTimer)
      this._pollTimer = null
    }
  },

  _poll(taskId) {
    this._pollCount = (this._pollCount || 0) + 1

    if (this._pollCount > 80) {
      this._replaceThinking(this._thinkingId, 'AI 响应超时，请稍后重试')
      this.setData({ loading: false })
      this._scrollToBottom()
      return
    }

    api.pollChatResult(taskId).then(result => {
      const status = result && result.status
      if (status === 'DONE') {
        const answer = result.answer || '未获取到回答'
        this._replaceThinking(this._thinkingId, answer)
        this.setData({ loading: false })
        this._scrollToBottom()
      } else if (status === 'ERROR') {
        const msg = result.errorMsg || 'AI 处理失败，请重试'
        this._replaceThinking(this._thinkingId, `抱歉，${msg}`)
        this.setData({ loading: false })
        this._scrollToBottom()
      } else {
        // PENDING —— 2.5 秒后再轮询
        this._pollTimer = setTimeout(() => this._poll(taskId), 2500)
      }
    }).catch(err => {
      if (err && err.code === 401) {
        this._replaceThinking(this._thinkingId, '登录已过期，请重新登录后继续。')
        this.setData({ isLoggedIn: false, loading: false })
        this._scrollToBottom()
      } else {
        // 网络抖动 —— 延长间隔后重试，不计入超时次数
        this._pollCount = Math.max(0, this._pollCount - 1)
        this._pollTimer = setTimeout(() => this._poll(taskId), 4000)
      }
    })
  },

  // ─── 消息工具 ────────────────────────────────────────────────────────────────

  _addUserMessage(content, attach) {
    const msg = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content,
      fileUrl: attach && attach.url ? attach.url : '',
      fileName: attach && attach.fileName ? attach.fileName : '',
      time: this._now(),
      thinking: false
    }
    this.setData({
      messages: [...this.data.messages, msg],
      attachedFile: null
    })
    this._scrollToBottom()
  },

  _addAiMessage(content) {
    const msg = {
      id: 'msg_' + Date.now(),
      role: 'ai',
      content,
      nodes: mdToHtml(content),
      time: this._now(),
      thinking: false
    }
    this.setData({ messages: [...this.data.messages, msg] })
    this._scrollToBottom()
  },

  _addThinking(id) {
    const msg = { id, role: 'ai', content: '', nodes: '', time: this._now(), thinking: true }
    this.setData({ messages: [...this.data.messages, msg] })
    this._scrollToBottom()
  },

  _replaceThinking(id, content) {
    const updated = this.data.messages.map(m =>
      m.id === id ? { ...m, content, nodes: mdToHtml(content), thinking: false } : m
    )
    this.setData({ messages: updated })
  },

  _scrollToBottom() {
    setTimeout(() => {
      const msgs = this.data.messages
      if (msgs.length > 0) {
        this.setData({ scrollToId: msgs[msgs.length - 1].id })
      }
    }, 80)
  },

  _now() {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
})
