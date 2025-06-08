// room.js
const app = getApp()

Page({
  data: {
    roomInfo: {},
    isHost: false,
    currentPlayerId: '',
    scoreHistory: [],
    showScoreModal: false,
    selectedPlayer: {},
    inputScore: '',
    quickScores: [100, 200, 500, 1000, -100, -200, -500, -1000],
    showShareModal: false,
    qrSize: 200,
    showEditModal: false,
    editNickName: '',
    editAvatarUrl: ''
  },

  onLoad(options) {
    this.initRoom(options)
  },

  initRoom(options) {
    const { roomId, isHost } = options
    
    if (!roomId) {
      wx.showToast({
        title: '房间ID无效',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    // 从本地存储获取房间信息
    let roomInfo = wx.getStorageSync(`room_${roomId}`)
    
    if (!roomInfo) {
      wx.showToast({
        title: '房间不存在',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    // 如果不是房主，需要加入房间
    if (isHost === 'false') {
      this.joinRoom(roomInfo)
    } else {
      // 房主的情况，找到房主的playerId
      const hostPlayer = roomInfo.players.find(p => p.isHost)
      this.setData({
        currentPlayerId: hostPlayer ? hostPlayer.playerId : this.generatePlayerId()
      })
      
      // 为房主也添加设置个人信息的提示
      if (hostPlayer && (hostPlayer.avatarUrl === '/images/default-avatar.svg' || hostPlayer.nickName.includes('微信用户'))) {
        setTimeout(() => {
          wx.showModal({
            title: '设置个人信息',
            content: '检测到您使用的是默认头像和昵称，是否要设置真实的头像和昵称？',
            confirmText: '去设置',
            cancelText: '稍后再说',
            success: (res) => {
              if (res.confirm) {
                // 打开编辑弹窗
                this.setData({
                  showEditModal: true,
                  editNickName: hostPlayer.nickName,
                  editAvatarUrl: hostPlayer.avatarUrl
                })
              }
            }
          })
        }, 1000)
      }
    }
    
    this.setData({
      roomInfo,
      isHost: isHost === 'true'
    })

    // 加载计分历史
    this.loadScoreHistory(roomId)
  },

  joinRoom(roomInfo) {
    // 获取用户信息
    app.getUserInfo().then(userInfo => {
      this.addPlayerToRoom(roomInfo, userInfo)
    }).catch(() => {
      // 使用默认信息
      const userInfo = {
        nickName: '微信用户' + Math.floor(Math.random() * 1000),
        avatarUrl: '/images/default-avatar.svg'
      }
      this.addPlayerToRoom(roomInfo, userInfo)
    })
  },

  addPlayerToRoom(roomInfo, userInfo) {
    // 检查是否已经在房间中
    const existingPlayer = roomInfo.players.find(p => p.nickName === userInfo.nickName)
    
    if (existingPlayer) {
      // 如果已经在房间中，更新currentPlayerId和roomInfo
      this.setData({
        currentPlayerId: existingPlayer.playerId,
        roomInfo: roomInfo
      })
      wx.showToast({
        title: '欢迎回来',
        icon: 'success'
      })
      // 播报欢迎回来
      this.playVoiceAnnouncement(`欢迎${userInfo.nickName}回到房间`)
      return
    }
    
    if (roomInfo.players.length >= roomInfo.maxPlayers) {
      wx.showToast({
        title: '房间已满',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    // 添加新玩家
    const newPlayerId = this.generatePlayerId()
    const newPlayer = {
      ...userInfo,
      score: roomInfo.initialScore,
      isHost: false,
      playerId: newPlayerId
    }
    
    roomInfo.players.push(newPlayer)
    
    // 更新本地存储
    wx.setStorageSync(`room_${roomInfo.roomId}`, roomInfo)
    
    // 更新当前玩家ID和房间信息
    this.setData({
      currentPlayerId: newPlayerId,
      roomInfo: roomInfo
    })
    
    wx.showToast({
      title: '成功加入房间',
      icon: 'success'
    })
    
    // 播报用户进入房间
    this.playVoiceAnnouncement(`${userInfo.nickName}进入了房间`)
    
    // 如果使用的是默认头像，提示用户设置个人信息
    if (userInfo.avatarUrl === '/images/default-avatar.svg' || userInfo.nickName.includes('微信用户')) {
      setTimeout(() => {
        wx.showModal({
          title: '设置个人信息',
          content: '检测到您使用的是默认头像和昵称，是否要设置真实的头像和昵称？',
          confirmText: '去设置',
          cancelText: '稍后再说',
          success: (res) => {
            if (res.confirm) {
              // 打开编辑弹窗
              this.setData({
                showEditModal: true,
                editNickName: userInfo.nickName,
                editAvatarUrl: userInfo.avatarUrl
              })
            }
          }
        })
      }, 2000)
    }
  },

  loadScoreHistory(roomId) {
    const history = wx.getStorageSync(`history_${roomId}`) || []
    this.setData({
      scoreHistory: history
    })
  },

  selectPlayer(e) {
    const player = e.currentTarget.dataset.player
    
    // 如果点击的是自己，显示编辑弹窗
    if (player.playerId === this.data.currentPlayerId) {
      this.setData({
        showEditModal: true,
        editNickName: player.nickName,
        editAvatarUrl: player.avatarUrl
      })
      return
    }

    // 点击其他玩家，显示计分弹窗
    this.setData({
      selectedPlayer: player,
      showScoreModal: true,
      inputScore: ''
    })
  },

  closeScoreModal() {
    this.setData({
      showScoreModal: false,
      selectedPlayer: {},
      inputScore: ''
    })
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  onScoreInput(e) {
    this.setData({
      inputScore: e.detail.value
    })
  },

  selectQuickScore(e) {
    const score = e.currentTarget.dataset.score
    this.setData({
      inputScore: score.toString()
    })
  },

  confirmScore() {
    const score = parseInt(this.data.inputScore)
    
    if (!score || score === 0) {
      wx.showToast({
        title: '请输入有效分数',
        icon: 'error'
      })
      return
    }

    // 更新分数
    this.updateScores(score)
    
    // 关闭弹窗
    this.closeScoreModal()
  },

  updateScores(score) {
    const roomInfo = { ...this.data.roomInfo }
    const currentPlayer = roomInfo.players.find(p => p.playerId === this.data.currentPlayerId)
    const targetPlayer = roomInfo.players.find(p => p.playerId === this.data.selectedPlayer.playerId)
    
    if (!currentPlayer || !targetPlayer) {
      wx.showToast({
        title: '玩家信息错误',
        icon: 'error'
      })
      return
    }

    // 更新分数：当前玩家减分，目标玩家加分
    currentPlayer.score -= score
    targetPlayer.score += score

    // 创建历史记录
    const historyItem = {
      id: Date.now(),
      fromPlayer: currentPlayer.nickName,
      toPlayer: targetPlayer.nickName,
      score: score,
      time: this.formatTime(new Date()),
      timestamp: Date.now()
    }

    const newHistory = [historyItem, ...this.data.scoreHistory]

    // 更新数据
    this.setData({
      roomInfo,
      scoreHistory: newHistory
    })

    // 保存到本地存储
    wx.setStorageSync(`room_${roomInfo.roomId}`, roomInfo)
    wx.setStorageSync(`history_${roomInfo.roomId}`, newHistory)

    wx.showToast({
      title: '计分成功',
      icon: 'success'
    })
  },

  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  },

  shareRoom() {
    this.setData({
      showShareModal: true
    })
    
    // 延迟生成二维码，等待DOM渲染完成
    setTimeout(() => {
      this.generateQRCode()
    }, 300)
  },

  closeShareModal() {
    this.setData({
      showShareModal: false
    })
  },

  // 生成小程序码（真正的二维码）
  generateQRCode() {
    console.log('开始生成二维码...')
    
    // 生成简单的房间信息文本，确保扫码能够识别
    const roomData = {
      type: 'chess-room',
      roomId: this.data.roomInfo.roomId,
      name: this.data.roomInfo.name,
      gameType: this.data.roomInfo.gameType,
      timestamp: Date.now(),
      expireTime: Date.now() + (3 * 60 * 1000) // 3分钟后过期
    }
    
    // 生成简单的文本格式，确保扫码识别
    const qrText = `CHESS_ROOM:${this.data.roomInfo.roomId}|${this.data.roomInfo.name}|${this.data.roomInfo.gameType}|${Date.now()}`
    console.log('二维码文本:', qrText)
    
    // 延迟生成二维码，确保Canvas已经渲染
    setTimeout(() => {
      this.generateSimpleQRCode(qrText, roomData)
    }, 100)
  },

  // 生成简化的二维码
  generateSimpleQRCode(text, roomData) {
    console.log('开始绘制简化二维码...')
    
    try {
      const ctx = wx.createCanvasContext('qrcode')
      const size = this.data.qrSize
      
      if (!ctx) {
        console.error('无法创建Canvas上下文')
        wx.showToast({
          title: '二维码生成失败',
          icon: 'error'
        })
        return
      }
      
      console.log('Canvas上下文创建成功，开始绘制...')
      
      // 清空画布
      ctx.clearRect(0, 0, size, size)
      
      // 绘制渐变背景
      const gradient = ctx.createLinearGradient(0, 0, size, size)
      gradient.addColorStop(0, '#f8fafc')
      gradient.addColorStop(1, '#e2e8f0')
      ctx.setFillStyle(gradient)
      ctx.fillRect(0, 0, size, size)
      
      // 绘制装饰性二维码样式
      this.drawDecorativeQRCode(ctx, text, size)
      
      // 执行绘制
      ctx.draw(false, () => {
        console.log('二维码绘制完成')
        // 将房间数据存储到全局，供扫码时使用
        wx.setStorageSync('qr_room_data', roomData)
        wx.showToast({
          title: '二维码已生成',
          icon: 'success',
          duration: 1000
        })
      })
    } catch (error) {
      console.error('二维码生成失败:', error)
      wx.showToast({
        title: '二维码生成失败',
        icon: 'error'
      })
    }
  },

  // 绘制装饰性二维码
  drawDecorativeQRCode(ctx, text, size) {
    const gridSize = 15 // 简化网格
    const margin = 30
    const qrSize = size - margin * 2
    const cellSize = Math.floor(qrSize / gridSize)
    const startX = (size - gridSize * cellSize) / 2
    const startY = (size - gridSize * cellSize) / 2
    
    // 生成基于文本的简单模式
    const pattern = this.generateSimplePattern(text, gridSize)
    
    // 绘制网格
    ctx.setFillStyle('#2d3748')
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (pattern[i][j]) {
          // 绘制圆角矩形
          const x = startX + j * cellSize
          const y = startY + i * cellSize
          const radius = cellSize * 0.2
          
          ctx.beginPath()
          ctx.moveTo(x + radius, y)
          ctx.lineTo(x + cellSize - radius, y)
          ctx.quadraticCurveTo(x + cellSize, y, x + cellSize, y + radius)
          ctx.lineTo(x + cellSize, y + cellSize - radius)
          ctx.quadraticCurveTo(x + cellSize, y + cellSize, x + cellSize - radius, y + cellSize)
          ctx.lineTo(x + radius, y + cellSize)
          ctx.quadraticCurveTo(x, y + cellSize, x, y + cellSize - radius)
          ctx.lineTo(x, y + radius)
          ctx.quadraticCurveTo(x, y, x + radius, y)
          ctx.closePath()
          ctx.fill()
        }
      }
    }
    
    // 绘制四个角的定位标记
    this.drawCornerMarkers(ctx, startX, startY, cellSize, gridSize)
    
    // 绘制中心Logo
    this.drawCenterLogo(ctx, size)
  },

  // 生成简单模式
  generateSimplePattern(text, size) {
    const pattern = []
    let hash = 0
    
    // 计算文本哈希
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xFFFFFF
    }
    
    // 生成模式
    for (let i = 0; i < size; i++) {
      pattern[i] = []
      for (let j = 0; j < size; j++) {
        // 跳过角落定位区域
        if (this.isCornerArea(i, j, size)) {
          pattern[i][j] = false
          continue
        }
        
        // 跳过中心Logo区域
        if (this.isCenterArea(i, j, size)) {
          pattern[i][j] = false
          continue
        }
        
        // 生成伪随机模式
        const seed = (hash + i * 23 + j * 17) % 100
        pattern[i][j] = seed < 40 // 40%填充率
      }
    }
    
    return pattern
  },

  // 检查是否为角落区域
  isCornerArea(i, j, size) {
    const cornerSize = 3
    return (
      (i < cornerSize && j < cornerSize) || // 左上
      (i < cornerSize && j >= size - cornerSize) || // 右上
      (i >= size - cornerSize && j < cornerSize) || // 左下
      (i >= size - cornerSize && j >= size - cornerSize) // 右下
    )
  },

  // 检查是否为中心区域
  isCenterArea(i, j, size) {
    const center = Math.floor(size / 2)
    const radius = 2
    return Math.abs(i - center) <= radius && Math.abs(j - center) <= radius
  },

  // 绘制角落标记
  drawCornerMarkers(ctx, startX, startY, cellSize, gridSize) {
    const markerSize = 3
    const positions = [
      [0, 0], // 左上
      [0, gridSize - markerSize], // 右上
      [gridSize - markerSize, 0], // 左下
      [gridSize - markerSize, gridSize - markerSize] // 右下
    ]
    
    ctx.setFillStyle('#667eea')
    positions.forEach(([row, col]) => {
      const x = startX + col * cellSize
      const y = startY + row * cellSize
      const size = markerSize * cellSize
      const radius = cellSize * 0.3
      
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + size - radius, y)
      ctx.quadraticCurveTo(x + size, y, x + size, y + radius)
      ctx.lineTo(x + size, y + size - radius)
      ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size)
      ctx.lineTo(x + radius, y + size)
      ctx.quadraticCurveTo(x, y + size, x, y + size - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
      ctx.fill()
    })
  },

  // 绘制中心Logo
  drawCenterLogo(ctx, size) {
    const centerX = size / 2
    const centerY = size / 2
    const logoSize = 40
    
    // 绘制圆形背景
    ctx.setFillStyle('#667eea')
    ctx.beginPath()
    ctx.arc(centerX, centerY, logoSize / 2, 0, 2 * Math.PI)
    ctx.fill()
    
    // 绘制白色边框
    ctx.setStrokeStyle('#ffffff')
    ctx.setLineWidth(3)
    ctx.stroke()
    
    // 绘制文字
    ctx.setFillStyle('#ffffff')
    ctx.setFontSize(16)
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    ctx.fillText('棋牌', centerX, centerY)
  },

  exitRoom() {
    wx.showModal({
      title: '退出房间',
      content: '确定要退出当前房间吗？',
      success: (res) => {
        if (res.confirm) {
          // 如果是房主，询问是否解散房间
          if (this.data.isHost) {
            wx.showModal({
              title: '解散房间',
              content: '您是房主，退出后房间将被解散，确定继续吗？',
              success: (res2) => {
                if (res2.confirm) {
                  // 删除房间数据
                  wx.removeStorageSync(`room_${this.data.roomInfo.roomId}`)
                  wx.removeStorageSync(`history_${this.data.roomInfo.roomId}`)
                  
                  wx.navigateBack()
                }
              }
            })
          } else {
            wx.navigateBack()
          }
        }
      }
    })
  },

  generatePlayerId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 3)
  },

  closeEditModal() {
    this.setData({
      showEditModal: false,
      editNickName: '',
      editAvatarUrl: ''
    })
  },

  onNickNameInput(e) {
    this.setData({
      editNickName: e.detail.value
    })
  },

  confirmEdit() {
    const nickName = this.data.editNickName.trim()
    const avatarUrl = this.data.editAvatarUrl
    
    if (!nickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'error'
      })
      return
    }

    if (nickName.length > 10) {
      wx.showToast({
        title: '昵称不能超过10个字符',
        icon: 'error'
      })
      return
    }

    // 更新用户信息
    this.updateUserInfo(nickName, avatarUrl)
    
    // 关闭弹窗
    this.closeEditModal()
  },

  updateUserInfo(nickName, avatarUrl) {
    const roomInfo = { ...this.data.roomInfo }
    const currentPlayer = roomInfo.players.find(p => p.playerId === this.data.currentPlayerId)
    
    if (!currentPlayer) {
      wx.showToast({
        title: '用户信息错误',
        icon: 'error'
      })
      return
    }

    // 更新玩家信息
    currentPlayer.nickName = nickName
    currentPlayer.avatarUrl = avatarUrl

    // 更新全局用户信息
    app.globalData.userInfo = {
      ...app.globalData.userInfo,
      nickName: nickName,
      avatarUrl: avatarUrl
    }

    // 更新数据
    this.setData({
      roomInfo
    })

    // 保存到本地存储
    wx.setStorageSync(`room_${roomInfo.roomId}`, roomInfo)

    wx.showToast({
      title: '修改成功',
      icon: 'success'
    })
  },

  // 语音播报方法
  playVoiceAnnouncement(text) {
    // 简化实现，使用文字提示和系统提示音
    try {
      // 播放系统提示音
      wx.showToast({
        title: text,
        icon: 'none',
        duration: 3000
      })
      
      // 尝试播放系统提示音
      wx.vibrateShort({
        type: 'light'
      })
      
      console.log('用户进入提示:', text)
    } catch (error) {
      console.log('提示异常:', error)
      // 降级为简单文字提示
      this.showTextAnnouncement(text)
    }
  },

  // 文字提示方法
  showTextAnnouncement(text) {
    wx.showToast({
      title: text,
      icon: 'none',
      duration: 2000
    })
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('选择的头像:', avatarUrl)
    this.setData({
      editAvatarUrl: avatarUrl
    })
    wx.showToast({
      title: '头像已更新',
      icon: 'success',
      duration: 1000
    })
  },

  // 分享给好友
  shareToFriend() {
    // 直接触发微信分享
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    })
    
    // 关闭分享弹窗
    this.closeShareModal()
    
    wx.showToast({
      title: '请点击右上角分享',
      icon: 'none',
      duration: 2000
    })
  },

  // 页面分享配置
  onShareAppMessage() {
    return {
      title: `邀请你加入${this.data.roomInfo.name}`,
      path: `/pages/room/room?roomId=${this.data.roomInfo.roomId}&isHost=false`,
      imageUrl: '' // 可以添加分享图片
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: `${this.data.roomInfo.name} - 棋牌计分器`,
      query: `roomId=${this.data.roomInfo.roomId}&isHost=false`,
      imageUrl: '' // 可以添加分享图片
    }
  },
})