// create-room.js
const app = getApp()

Page({
  data: {
    gameTypes: [
      {
        name: '掼蛋',
        icon: '🃏',
        desc: '四人对战经典游戏'
      },
      {
        name: '斗地主',
        icon: '🀄',
        desc: '三人对战经典游戏'
      },
      {
        name: '扑克',
        icon: '🂠',
        desc: '多人扑克游戏'
      },
      {
        name: '其他',
        icon: '🎲',
        desc: '自定义游戏类型'
      }
    ],
    selectedGameIndex: -1
  },

  selectGameType(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({
      selectedGameIndex: index
    })
    
    // 选择后直接创建房间
    this.createRoom()
  },

  createRoom() {
    if (this.data.selectedGameIndex === -1) {
      wx.showToast({
        title: '请选择游戏类型',
        icon: 'error'
      })
      return
    }

    wx.showLoading({
      title: '创建中...'
    })

    // 获取用户信息
    this.getUserInfoAndCreateRoom()
  },

  getUserInfoAndCreateRoom() {
    // 先尝试从全局数据获取
    let userInfo = app.globalData.userInfo
    
    if (userInfo) {
      this.doCreateRoom(userInfo)
    } else {
      // 获取用户信息
      wx.getUserProfile({
        desc: '用于创建房间和显示用户信息',
        success: (res) => {
          userInfo = res.userInfo
          app.globalData.userInfo = userInfo
          this.doCreateRoom(userInfo)
        },
        fail: () => {
          // 如果用户拒绝授权，尝试使用getUserInfo
          wx.getUserInfo({
            success: (res) => {
              userInfo = res.userInfo
              app.globalData.userInfo = userInfo
              this.doCreateRoom(userInfo)
            },
            fail: () => {
              // 最后使用默认信息
              userInfo = {
                nickName: '微信用户' + Math.floor(Math.random() * 1000),
                avatarUrl: '/images/default-avatar.svg'
              }
              this.doCreateRoom(userInfo)
            }
          })
        }
      })
    }
  },

  doCreateRoom(userInfo) {
    // 生成房间ID
    const roomId = this.generateRoomId()
    
    // 创建房间数据
    const selectedGame = this.data.gameTypes[this.data.selectedGameIndex]
    
    // 根据游戏类型设置最大人数
    let maxPlayers = 8 // 默认8人
    if (selectedGame.name === '掼蛋') {
      maxPlayers = 4 // 掼蛋4人游戏
    } else if (selectedGame.name === '斗地主') {
      maxPlayers = 3 // 斗地主3人游戏
    }
    
    const roomData = {
      roomId: roomId,
      name: `${selectedGame.name}房间`,
      gameType: selectedGame.name,
      maxPlayers: maxPlayers,
      initialScore: 0, // 初始分数改为0
      host: userInfo,
      players: [{
        ...userInfo,
        score: 0, // 初始分数改为0
        isHost: true,
        playerId: this.generatePlayerId()
      }],
      createdAt: new Date().getTime()
    }

    // 保存房间数据到本地存储
    wx.setStorageSync(`room_${roomId}`, roomData)
    app.globalData.roomInfo = roomData

    wx.hideLoading()

    // 跳转到房间页面
    wx.redirectTo({
      url: `/pages/room/room?roomId=${roomId}&isHost=true`
    })
  },

  generateRoomId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  },

  generatePlayerId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 3)
  },

  goBack() {
    wx.navigateBack()
  }
})