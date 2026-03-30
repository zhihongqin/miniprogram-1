const api = require('../../utils/api')
const { showToast } = require('../../utils/util')

const QUICK_QUESTIONS = [
  '劳动合同到期不续签需要赔偿吗？',
  '签了合同对方违约怎么办？',
  '跨国贸易纠纷如何维权？',
  '知识产权侵权如何索赔？'
]

Page({
  data: {
    isLoggedIn: false,
    messages: [],
    inputText: '',
    loading: false,
    chatId: '',
    showQuickQuestions: true,
    quickQuestions: QUICK_QUESTIONS,
    scrollToId: ''
  },

  onLoad() {
    this.setData({ chatId: 'chat_' + Date.now() })
  },

  onShow() {
    const app = getApp()
    const loggedIn = app.isLoggedIn()
    this.setData({ isLoggedIn: loggedIn })

    // 刚完成登录后返回页面，补发欢迎语
    if (loggedIn && this.data.messages.length === 0) {
      this._addAiMessage(
        '您好！我是法律智能助手，专注于涉外法律领域。\n\n' +
        '您可以向我咨询合同纠纷、知识产权、贸易争端、劳动法等方面的问题，我会尽力为您提供专业解答。'
      )
    }
  },

  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onInputChange(e) {
    this.setData({ inputText: e.detail.value })
  },

  onTapQuickQuestion(e) {
    const question = e.currentTarget.dataset.q
    this.setData({ inputText: question })
    this._doSend(question)
  },

  onSend() {
    const text = this.data.inputText.trim()
    if (!text || this.data.loading) return
    this._doSend(text)
  },

  async _doSend(text) {
    if (this.data.loading) return

    // 未登录时拦截，提示去登录
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

    this._addUserMessage(text)
    this.setData({ inputText: '', loading: true, showQuickQuestions: false })

    // 添加 AI 思考占位
    const thinkingId = 'msg_' + Date.now()
    this.setData({
      messages: [...this.data.messages, {
        id: thinkingId,
        role: 'ai',
        content: '',
        time: this._formatTime(),
        thinking: true
      }]
    })
    this._scrollToBottom()

    try {
      const result = await api.askLegalQuestion(text, this.data.chatId)
      const answer = (result && result.answer) ? result.answer : (result || '未获取到回答')
      this._replaceThinking(thinkingId, answer)
    } catch (err) {
      if (err && err.code === 401) {
        // Token 过期，清除登录态，提示重新登录
        this._replaceThinking(thinkingId, '登录已过期，请重新登录后继续提问。')
        this.setData({ isLoggedIn: false })
        setTimeout(() => {
          wx.navigateTo({ url: '/pages/login/login' })
        }, 1500)
      } else {
        const errMsg = (err && err.message) ? err.message : '请求失败，请稍后重试'
        this._replaceThinking(thinkingId, `抱歉，${errMsg}`)
        showToast(errMsg)
      }
    } finally {
      this.setData({ loading: false })
      this._scrollToBottom()
    }
  },

  _replaceThinking(thinkingId, content) {
    const updated = this.data.messages.map(m =>
      m.id === thinkingId
        ? { ...m, content, thinking: false }
        : m
    )
    this.setData({ messages: updated })
  },

  _addUserMessage(content) {
    const msg = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content,
      time: this._formatTime(),
      thinking: false
    }
    this.setData({ messages: [...this.data.messages, msg] })
    this._scrollToBottom()
  },

  _addAiMessage(content) {
    const msg = {
      id: 'msg_' + Date.now(),
      role: 'ai',
      content,
      time: this._formatTime(),
      thinking: false
    }
    this.setData({ messages: [...this.data.messages, msg] })
    this._scrollToBottom()
  },

  _scrollToBottom() {
    setTimeout(() => {
      const msgs = this.data.messages
      if (msgs.length > 0) {
        this.setData({ scrollToId: msgs[msgs.length - 1].id })
      }
    }, 100)
  },

  _formatTime() {
    const d = new Date()
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  },

  onClearChat() {
    if (!this.data.isLoggedIn) return
    wx.showModal({
      title: '清空对话',
      content: '确定要清空当前对话记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            messages: [],
            chatId: 'chat_' + Date.now(),
            showQuickQuestions: true
          })
          this._addAiMessage('对话已清空，请继续向我提问。')
        }
      }
    })
  }
})
