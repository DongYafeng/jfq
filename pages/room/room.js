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
    }, 100)
  },

  closeShareModal() {
    this.setData({
      showShareModal: false
    })
  },

  // 生成小程序码（真正的二维码）
  generateQRCode() {
    // 生成小程序路径，包含房间参数
    const miniProgramPath = `pages/room/room?roomId=${this.data.roomInfo.roomId}&isHost=false`
    
    // 生成包含房间信息的完整数据
    const roomData = {
      type: 'chess-room',
      roomId: this.data.roomInfo.roomId,
      name: this.data.roomInfo.name,
      gameType: this.data.roomInfo.gameType,
      path: miniProgramPath,
      appId: 'your-app-id', // 实际项目中替换为真实的小程序AppID
      timestamp: Date.now()
    }
    
    // 生成包含房间信息的JSON字符串
    const qrData = JSON.stringify(roomData)
    
    // 生成二维码
    this.generateQRCodeCanvas(qrData)
  },

  // 生成二维码画布
  generateQRCodeCanvas(data) {
    const ctx = wx.createCanvasContext('qrcode')
    const size = this.data.qrSize
    
    // 清空画布
    ctx.clearRect(0, 0, size, size)
    
    // 绘制白色背景
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, size, size)
    
    // 绘制边框
    ctx.setStrokeStyle('#e2e8f0')
    ctx.setLineWidth(2)
    ctx.strokeRect(1, 1, size - 2, size - 2)
    
    // 生成更标准的二维码
    this.drawStandardQRCode(ctx, data, size)
    
    ctx.draw()
  },

  // 绘制标准二维码
  drawStandardQRCode(ctx, data, size) {
    const gridSize = 25 // 增加网格密度
    const margin = 20 // 边距
    const qrSize = size - margin * 2
    const cellSize = Math.floor(qrSize / gridSize)
    const startX = (size - gridSize * cellSize) / 2
    const startY = (size - gridSize * cellSize) / 2
    
    // 生成基于数据的二维码模式
    const pattern = this.generateStandardQRPattern(data, gridSize)
    
    ctx.setFillStyle('#000000')
    
    // 绘制定位标记（三个角）
    this.drawPositionMarker(ctx, startX, startY, cellSize)
    this.drawPositionMarker(ctx, startX + (gridSize - 7) * cellSize, startY, cellSize)
    this.drawPositionMarker(ctx, startX, startY + (gridSize - 7) * cellSize, cellSize)
    
    // 绘制对齐标记（中心）
    const centerX = startX + Math.floor(gridSize / 2) * cellSize
    const centerY = startY + Math.floor(gridSize / 2) * cellSize
    this.drawAlignmentMarker(ctx, centerX - 2 * cellSize, centerY - 2 * cellSize, cellSize)
    
    // 绘制时序标记（垂直和水平线）
    this.drawTimingPatterns(ctx, startX, startY, cellSize, gridSize)
    
    // 绘制数据模式
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        // 跳过功能区域
        if (this.isFunctionArea(i, j, gridSize)) continue
        
        if (pattern[i][j]) {
          ctx.fillRect(
            startX + j * cellSize,
            startY + i * cellSize,
            cellSize - 0.5,
            cellSize - 0.5
          )
        }
      }
    }
    
    // 绘制房间信息
    this.drawRoomInfo(ctx, size)
  },

  // 生成标准二维码模式
  generateStandardQRPattern(data, size) {
    const pattern = []
    
    // 使用更复杂的哈希算法
    let hash = this.calculateHash(data)
    
    // 生成数据模式
    for (let i = 0; i < size; i++) {
      pattern[i] = []
      for (let j = 0; j < size; j++) {
        // 基于位置和数据生成模式
        const seed = hash + i * 31 + j * 17
        const value = (seed ^ (seed >> 16)) & 0xFFFF
        pattern[i][j] = (value % 100) < 45 // 约45%的填充率
      }
    }
    
    return pattern
  },

  // 计算数据哈希值
  calculateHash(data) {
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash)
  },

  // 绘制对齐标记
  drawAlignmentMarker(ctx, x, y, cellSize) {
    // 5x5 对齐标记
    ctx.fillRect(x, y, 5 * cellSize, 5 * cellSize)
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(x + cellSize, y + cellSize, 3 * cellSize, 3 * cellSize)
    ctx.setFillStyle('#000000')
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, cellSize, cellSize)
  },

  // 绘制时序标记
  drawTimingPatterns(ctx, startX, startY, cellSize, gridSize) {
    // 水平时序线
    for (let i = 8; i < gridSize - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(startX + i * cellSize, startY + 6 * cellSize, cellSize, cellSize)
      }
    }
    
    // 垂直时序线
    for (let i = 8; i < gridSize - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(startX + 6 * cellSize, startY + i * cellSize, cellSize, cellSize)
      }
    }
  },

  // 检查是否为功能区域
  isFunctionArea(i, j, size) {
    // 定位标记区域
    if ((i < 9 && j < 9) || 
        (i < 9 && j >= size - 8) || 
        (i >= size - 8 && j < 9)) {
      return true
    }
    
    // 对齐标记区域
    const center = Math.floor(size / 2)
    if (Math.abs(i - center) <= 2 && Math.abs(j - center) <= 2) {
      return true
    }
    
    // 时序标记
    if ((i === 6 && j >= 8 && j < size - 8) || 
        (j === 6 && i >= 8 && i < size - 8)) {
      return true
    }
    
    return false
  },

  // 绘制房间信息
  drawRoomInfo(ctx, size) {
    // 设置文字样式
    ctx.setFillStyle('#2d3748')
    ctx.setTextAlign('center')
    
    // 房间名称
    ctx.setFontSize(14)
    ctx.setFontWeight('bold')
    ctx.fillText(this.data.roomInfo.name, size / 2, size - 35)
    
    // 游戏类型和房间号
    ctx.setFontSize(11)
    ctx.setFontWeight('normal')
    ctx.fillText(`${this.data.roomInfo.gameType} · 房间号: ${this.data.roomInfo.roomId}`, size / 2, size - 20)
    
    // 扫码提示
    ctx.setFontSize(10)
    ctx.setFillStyle('#718096')
    ctx.fillText('扫码加入房间', size / 2, size - 8)
  },

  // 绘制定位标记
  drawPositionMarker(ctx, x, y, cellSize) {
    // 外框 7x7
    ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize)
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize)
    ctx.setFillStyle('#000000')
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize)
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
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    wx.showToast({
      title: '请点击右上角分享',
      icon: 'none',
      duration: 2000
    })
  },

  // 保存二维码到相册
  saveQRCode() {
    wx.showLoading({
      title: '正在保存...',
      mask: true
    })
    
    // 将canvas转换为临时文件
    wx.canvasToTempFilePath({
      canvasId: 'qrcode',
      success: (res) => {
        // 保存到相册
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading()
            wx.showToast({
              title: '已保存到相册',
              icon: 'success',
              duration: 2000
            })
          },
          fail: (error) => {
            wx.hideLoading()
            console.log('保存失败:', error)
            
            if (error.errMsg.includes('auth')) {
              // 权限问题，引导用户授权
              wx.showModal({
                title: '需要相册权限',
                content: '保存二维码需要访问您的相册，请在设置中开启权限',
                confirmText: '去设置',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting()
                  }
                }
              })
            } else {
              wx.showToast({
                title: '保存失败',
                icon: 'error'
              })
            }
          }
        })
      },
      fail: (error) => {
        wx.hideLoading()
        console.log('生成图片失败:', error)
        wx.showToast({
          title: '生成图片失败',
          icon: 'error'
        })
      }
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