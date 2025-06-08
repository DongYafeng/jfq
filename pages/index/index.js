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
          
          // 方式1: 解析新的简单文本格式 CHESS_ROOM:roomId|name|gameType|timestamp
          if (res.result.startsWith('CHESS_ROOM:')) {
            console.log('检测到棋牌房间二维码格式')
            try {
              const parts = res.result.replace('CHESS_ROOM:', '').split('|')
              if (parts.length >= 4) {
                roomId = parts[0]
                const timestamp = parseInt(parts[3])
                const now = Date.now()
                const qrAge = now - timestamp
                const maxAge = 3 * 60 * 1000 // 3分钟有效期
                
                if (qrAge > maxAge) {
                  wx.showModal({
                    title: '二维码已过期',
                    content: '此二维码已超过3分钟，请向房主索取新的二维码',
                    showCancel: false
                  })
                  return
                }
                
                console.log('解析到房间ID:', roomId)
              }
            } catch (e) {
              console.log('简单格式解析失败:', e)
            }
          }
          
          // 方式2: 解析JSON格式的二维码（兼容旧格式）
          if (!roomId) {
            try {
              roomData = JSON.parse(res.result)
              if (roomData && roomData.type === 'chess-room' && roomData.roomId) {
                roomId = roomData.roomId
                console.log('JSON格式解析成功，房间ID:', roomId)
                
                // 验证二维码时效性
                if (roomData.timestamp) {
                  const now = Date.now()
                  const qrAge = now - roomData.timestamp
                  const maxAge = 3 * 60 * 1000 // 3分钟有效期
                  
                  if (qrAge > maxAge) {
                    wx.showModal({
                      title: '二维码已过期',
                      content: '此二维码已超过3分钟，请向房主索取新的二维码',
                      showCancel: false
                    })
                    return
                  }
                }
              }
            } catch (e) {
              console.log('JSON解析失败，尝试其他格式:', e)
            }
          }
          
          // 方式3: 解析URL参数格式（兼容旧格式）
          if (!roomId) {
            try {
              const urlParams = new URLSearchParams(res.result.split('?')[1] || res.result)
              roomId = urlParams.get('roomId')
              if (roomId) {
                console.log('URL参数格式解析成功，房间ID:', roomId)
              }
            } catch (e) {
              console.log('URL参数解析失败:', e)
            }
          }
          
          // 方式4: 直接匹配房间号格式
          if (!roomId) {
            const roomIdMatch = res.result.match(/roomId[=:](\w+)/i)
            if (roomIdMatch) {
              roomId = roomIdMatch[1]
              console.log('正则匹配成功，房间ID:', roomId)
            }
          }
          
          // 方式5: 检查是否有存储的房间数据（用于装饰性二维码）
          if (!roomId) {
            const storedData = wx.getStorageSync('qr_room_data')
            if (storedData && storedData.roomId) {
              // 检查存储数据的时效性
              const now = Date.now()
              const dataAge = now - storedData.timestamp
              const maxAge = 3 * 60 * 1000 // 3分钟有效期
              
              if (dataAge <= maxAge) {
                roomId = storedData.roomId
                console.log('使用存储的房间数据，房间ID:', roomId)
                
                // 显示确认对话框
                wx.showModal({
                  title: '确认加入房间',
                  content: `检测到房间：${storedData.name}\n游戏类型：${storedData.gameType}\n是否加入此房间？`,
                  confirmText: '加入',
                  cancelText: '取消',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      this.joinRoomById(roomId)
                    }
                  }
                })
                return
              } else {
                console.log('存储的房间数据已过期')
                wx.removeStorageSync('qr_room_data')
              }
            }
          }
          
          if (roomId) {
            console.log('最终解析到的房间ID:', roomId)
            this.joinRoomById(roomId)
          } else {
            console.log('无法解析房间ID，二维码内容:', res.result)
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
  },

  // 根据房间ID加入房间
  joinRoomById(roomId) {
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
            },
            fail: (error) => {
              console.log('页面跳转失败:', error)
              wx.showToast({
                title: '加入房间失败',
                icon: 'error'
              })
            }
          })
        }
      }
    })
  }
})