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
    editNickName: ''
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
    let userInfo = app.globalData.userInfo
    
    if (!userInfo) {
      // 如果没有用户信息，尝试获取
      wx.getUserProfile({
        desc: '用于加入房间和显示用户信息',
        success: (res) => {
          userInfo = res.userInfo
          app.globalData.userInfo = userInfo
          this.addPlayerToRoom(roomInfo, userInfo)
        },
        fail: () => {
          // 如果用户拒绝授权，尝试使用getUserInfo
          wx.getUserInfo({
            success: (res) => {
              userInfo = res.userInfo
              app.globalData.userInfo = userInfo
              this.addPlayerToRoom(roomInfo, userInfo)
            },
            fail: () => {
              // 最后使用默认信息
              userInfo = {
                nickName: '微信用户' + Math.floor(Math.random() * 1000),
                avatarUrl: '/images/default-avatar.svg'
              }
              this.addPlayerToRoom(roomInfo, userInfo)
            }
          })
        }
      })
    } else {
      this.addPlayerToRoom(roomInfo, userInfo)
    }
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
        editNickName: player.nickName
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

  generateQRCode() {
    const roomData = {
      type: 'chess-room',
      roomId: this.data.roomInfo.roomId,
      name: this.data.roomInfo.name
    }
    
    // 生成二维码内容
    const qrContent = JSON.stringify(roomData)
    
    // 使用Canvas绘制二维码（简化处理，显示房间信息）
    const ctx = wx.createCanvasContext('qrcode')
    const size = this.data.qrSize
    
    // 绘制渐变背景
    const gradient = ctx.createLinearGradient(0, 0, size, size)
    gradient.addColorStop(0, '#f8fafc')
    gradient.addColorStop(1, '#e2e8f0')
    ctx.setFillStyle(gradient)
    ctx.fillRect(0, 0, size, size)
    
    // 绘制圆角边框
    ctx.setStrokeStyle('#cbd5e0')
    ctx.setLineWidth(3)
    this.drawRoundedRect(ctx, 2, 2, size - 4, size - 4, 12)
    ctx.stroke()
    
    // 绘制二维码模拟图案（简化版）
    this.drawSimpleQR(ctx, size)
    
    ctx.draw()
  },

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  },

  drawSimpleQR(ctx, size) {
    const blockSize = 8
    const blocks = Math.floor(size / blockSize)
    const margin = 16 // 增加边距
    
    // 创建渐变色
    const gradient = ctx.createLinearGradient(0, 0, size, size)
    gradient.addColorStop(0, '#667eea')
    gradient.addColorStop(0.5, '#764ba2')
    gradient.addColorStop(1, '#667eea')
    
    // 绘制三个定位正方形（使用渐变色）
    this.drawPositionSquare(ctx, margin, margin, blockSize * 6, gradient)
    this.drawPositionSquare(ctx, size - margin - blockSize * 6, margin, blockSize * 6, gradient)
    this.drawPositionSquare(ctx, margin, size - margin - blockSize * 6, blockSize * 6, gradient)
    
    // 绘制中心装饰图案
    this.drawCenterPattern(ctx, size, gradient)
    
    // 绘制随机数据点（使用渐变色）
    ctx.setFillStyle(gradient)
    for (let i = 0; i < blocks; i++) {
      for (let j = 0; j < blocks; j++) {
        const x = i * blockSize
        const y = j * blockSize
        
        // 跳过定位区域和中心区域
        if ((x < margin + blockSize * 7 && y < margin + blockSize * 7) || 
            (x > size - margin - blockSize * 8 && y < margin + blockSize * 7) || 
            (x < margin + blockSize * 7 && y > size - margin - blockSize * 8) ||
            (x > size/2 - blockSize * 3 && x < size/2 + blockSize * 3 && 
             y > size/2 - blockSize * 3 && y < size/2 + blockSize * 3)) {
          continue
        }
        
        if (Math.random() > 0.4) {
          // 绘制圆角方块
          this.drawRoundedBlock(ctx, x, y, blockSize - 2, 2)
        }
      }
    }
  },

  drawRoundedBlock(ctx, x, y, size, radius) {
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
  },

  drawCenterPattern(ctx, size, gradient) {
    const centerX = size / 2
    const centerY = size / 2
    const patternSize = 32
    
    ctx.setFillStyle(gradient)
    
    // 绘制中心装饰圆形
    ctx.beginPath()
    ctx.arc(centerX, centerY, patternSize / 2, 0, 2 * Math.PI)
    ctx.fill()
    
    // 绘制内部白色圆形
    ctx.setFillStyle('#ffffff')
    ctx.beginPath()
    ctx.arc(centerX, centerY, patternSize / 3, 0, 2 * Math.PI)
    ctx.fill()
    
    // 绘制中心小圆点
    ctx.setFillStyle(gradient)
    ctx.beginPath()
    ctx.arc(centerX, centerY, patternSize / 6, 0, 2 * Math.PI)
    ctx.fill()
  },

  drawPositionSquare(ctx, x, y, size, gradient) {
    ctx.setFillStyle(gradient)
    
    // 外框（圆角）
    this.drawRoundedBlock(ctx, x, y, size, 4)
    
    // 内部白色区域
    ctx.setFillStyle('#ffffff')
    const innerMargin = size / 6
    this.drawRoundedBlock(ctx, x + innerMargin, y + innerMargin, size - 2 * innerMargin, 2)
    
    // 中心方块
    ctx.setFillStyle(gradient)
    const centerMargin = size / 3
    this.drawRoundedBlock(ctx, x + centerMargin, y + centerMargin, size - 2 * centerMargin, 2)
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
      editNickName: ''
    })
  },

  onNickNameInput(e) {
    this.setData({
      editNickName: e.detail.value
    })
  },

  confirmEdit() {
    const nickName = this.data.editNickName.trim()
    
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

    // 获取当前用户的头像
    const currentPlayer = this.data.roomInfo.players.find(p => p.playerId === this.data.currentPlayerId)
    const currentAvatar = currentPlayer ? currentPlayer.avatarUrl : '/images/default-avatar.svg'

    // 更新用户信息
    this.updateUserInfo(nickName, currentAvatar)
    
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
})