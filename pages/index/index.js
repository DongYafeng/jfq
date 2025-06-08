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
          let roomId = null
          let roomData = null
          
          // 方式1: 解析JSON格式的二维码（新格式）
          try {
            roomData = JSON.parse(res.result)
            if (roomData && roomData.type === 'chess-room' && roomData.roomId) {
              roomId = roomData.roomId
              
              // 验证二维码时效性（可选，防止过期二维码）
              if (roomData.timestamp) {
                const now = Date.now()
                const qrAge = now - roomData.timestamp
                const maxAge = 24 * 60 * 60 * 1000 // 24小时有效期
                
                if (qrAge > maxAge) {
                  wx.showModal({
                    title: '二维码已过期',
                    content: '此二维码已超过24小时，请向房主索取新的二维码',
                    showCancel: false
                  })
                  return
                }
              }
            }
          } catch (e) {
            console.log('JSON解析失败，尝试其他格式')
          }
          
          // 方式2: 解析URL参数格式（兼容旧格式）
          if (!roomId) {
            try {
              const urlParams = new URLSearchParams(res.result.split('?')[1] || res.result)
              roomId = urlParams.get('roomId')
            } catch (e) {
              console.log('URL参数解析失败')
            }
          }
          
          // 方式3: 直接匹配房间号格式
          if (!roomId) {
            const roomIdMatch = res.result.match(/roomId[=:](\w+)/i)
            if (roomIdMatch) {
              roomId = roomIdMatch[1]
            }
          }
          
          if (roomId) {
            // 显示加载提示
            wx.showLoading({
              title: '正在加入房间...',
              mask: true
            })
            
            // 检查房间是否存在
            const roomInfo = wx.getStorageSync(`room_${roomId}`)
            
            wx.hideLoading()
            
            if (!roomInfo) {
              wx.showModal({
                title: '房间不存在',
                content: '房间可能已解散或房间号错误，请确认后重试',
                showCancel: false
              })
              return
            }
            
            // 检查房间是否已满
            if (roomInfo.players.length >= roomInfo.maxPlayers) {
              wx.showModal({
                title: '房间已满',
                content: `房间已达到最大人数限制(${roomInfo.maxPlayers}人)`,
                showCancel: false
              })
              return
            }
            
            // 显示房间信息确认
            wx.showModal({
              title: '确认加入房间',
              content: `房间名称：${roomInfo.name}\n游戏类型：${roomInfo.gameType}\n当前人数：${roomInfo.players.length}/${roomInfo.maxPlayers}`,
              confirmText: '加入',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 跳转到房间页面
                  wx.navigateTo({
                    url: `/pages/room/room?roomId=${roomId}&isHost=false`,
                    success: () => {
                      wx.showToast({
                        title: '正在加入房间',
                        icon: 'loading',
                        duration: 1500
                      })
                    }
                  })
                }
              }
            })
          } else {
            wx.showModal({
              title: '无效的二维码',
              content: '这不是有效的房间二维码，请扫描房主分享的二维码',
              showCancel: false
            })
          }
        } catch (error) {
          console.log('解析二维码失败:', error)
          wx.showModal({
            title: '扫码失败',
            content: '二维码格式不正确，请重新扫描',
            showCancel: false
          })
        }
      },
      fail: (error) => {
        console.log('扫码失败:', error)
        if (error.errMsg !== 'scanCode:fail cancel') {
          wx.showModal({
            title: '扫码失败',
            content: '无法打开相机或扫码功能，请检查权限设置',
            showCancel: false
          })
        }
      }
    })
  }
})