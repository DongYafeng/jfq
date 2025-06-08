// index.js
const app = getApp()

Page({
  data: {
    showJoinModal: false,
    roomIdInput: ''
  },

  onLoad() {
  },

  // 创建房间
  createRoom() {
    wx.navigateTo({
      url: '/pages/create-room/create-room'
    })
  },

  // 扫码进房
  scanCode() {
    wx.scanCode({
      success: (res) => {
        console.log('扫码结果:', res.result)
        
        try {
          const roomData = JSON.parse(res.result)
          
          if (roomData && roomData.type === 'chess-room' && roomData.roomId) {
            // 跳转到房间页面
            wx.navigateTo({
              url: `/pages/room/room?roomId=${roomData.roomId}&isHost=false`
            })
          } else {
            wx.showToast({
              title: '无效的房间二维码',
              icon: 'error'
            })
          }
        } catch (error) {
          console.log('解析二维码失败:', error)
          wx.showToast({
            title: '无效的房间二维码',
            icon: 'error'
          })
        }
      },
      fail: (error) => {
        console.log('扫码失败:', error)
        if (error.errMsg !== 'scanCode:fail cancel') {
          wx.showToast({
            title: '扫码失败',
            icon: 'error'
          })
        }
      }
    })
  },

  // 显示手动加入弹窗
  showJoinRoomModal() {
    this.setData({
      showJoinModal: true,
      roomIdInput: ''
    })
  },

  // 关闭手动加入弹窗
  closeJoinModal() {
    this.setData({
      showJoinModal: false,
      roomIdInput: ''
    })
  },

  // 输入房间号
  onRoomIdInput(e) {
    this.setData({
      roomIdInput: e.detail.value
    })
  },

  // 确认加入房间
  confirmJoinRoom() {
    const roomId = this.data.roomIdInput.trim()
    
    if (!roomId) {
      wx.showToast({
        title: '请输入房间号',
        icon: 'error'
      })
      return
    }

    // 检查房间是否存在
    const roomInfo = wx.getStorageSync(`room_${roomId}`)
    
    if (!roomInfo) {
      wx.showToast({
        title: '房间不存在',
        icon: 'error'
      })
      return
    }

    // 关闭弹窗
    this.closeJoinModal()

    // 跳转到房间页面
    wx.navigateTo({
      url: `/pages/room/room?roomId=${roomId}&isHost=false`
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止事件冒泡
  }
})