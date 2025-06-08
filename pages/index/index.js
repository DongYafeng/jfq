// index.js
const app = getApp()

Page({
  data: {
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
  }
})