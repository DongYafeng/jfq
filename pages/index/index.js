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
          // 尝试解析小程序码参数
          let roomId = null
          
          // 方式1: 解析JSON格式的二维码
          try {
            const roomData = JSON.parse(res.result)
            if (roomData && roomData.type === 'chess-room' && roomData.roomId) {
              roomId = roomData.roomId
            }
          } catch (e) {
            // 方式2: 解析URL参数格式
            const urlParams = new URLSearchParams(res.result.split('?')[1] || res.result)
            roomId = urlParams.get('roomId')
          }
          
          if (roomId) {
            // 检查房间是否存在
            const roomInfo = wx.getStorageSync(`room_${roomId}`)
            
            if (!roomInfo) {
              wx.showToast({
                title: '房间不存在或已解散',
                icon: 'error'
              })
              return
            }
            
            // 跳转到房间页面
            wx.navigateTo({
              url: `/pages/room/room?roomId=${roomId}&isHost=false`
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