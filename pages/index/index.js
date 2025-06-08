// index.js
const app = getApp()

Page({
  data: {
  },

  onLoad(options) {
    console.log('首页加载参数:', options)
    
    // 检查是否通过分享链接进入
    if (options.shareData) {
      try {
        const shareData = JSON.parse(decodeURIComponent(options.shareData))
        console.log('解析分享数据:', shareData)
        
        // 验证分享数据的时效性
        if (shareData.timestamp) {
          const now = Date.now()
          const shareAge = now - shareData.timestamp
          const maxAge = 30 * 60 * 1000 // 30分钟有效期
          
          if (shareAge > maxAge) {
            wx.showModal({
              title: '分享链接已过期',
              content: '此分享链接已超过30分钟，请向房主索取新的分享链接',
              showCancel: false
            })
            return
          }
        }
        
        // 显示加入房间确认
        wx.showModal({
          title: '加入房间',
          content: `房间名称：${shareData.name}\n游戏类型：${shareData.gameType}\n是否加入此房间？`,
          confirmText: '加入',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this.joinRoomWithData(shareData)
            }
          }
        })
      } catch (error) {
        console.log('解析分享数据失败:', error)
        wx.showToast({
          title: '分享链接无效',
          icon: 'error'
        })
      }
    }
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
          let roomData = null
          
          // 方式1: 解析JSON格式的二维码（新格式，包含完整房间信息）
          try {
            roomData = JSON.parse(res.result)
            if (roomData && roomData.type === 'chess-room' && roomData.roomId) {
              console.log('JSON格式解析成功，房间数据:', roomData)
              
              // 验证二维码时效性
              if (roomData.timestamp) {
                const now = Date.now()
                const qrAge = now - roomData.timestamp
                const maxAge = 10 * 60 * 1000 // 10分钟有效期
                
                if (qrAge > maxAge) {
                  wx.showModal({
                    title: '二维码已过期',
                    content: '此二维码已超过10分钟，请向房主索取新的二维码',
                    showCancel: false
                  })
                  return
                }
              }
              
              // 对于简化的二维码，需要从本地存储获取完整房间信息
              const localRoomInfo = wx.getStorageSync(`room_${roomData.roomId}`)
              if (localRoomInfo) {
                // 使用本地存储的完整房间信息
                this.joinRoomWithData(localRoomInfo)
              } else {
                // 如果本地没有房间信息，直接根据房间ID加入
                this.joinRoomById(roomData.roomId)
              }
              return
            }
          } catch (e) {
            console.log('JSON解析失败，尝试其他格式:', e)
          }
          
          // 方式2: 解析简单文本格式 CHESS_ROOM:roomId|name|gameType|timestamp（兼容旧格式）
          if (res.result.startsWith('CHESS_ROOM:')) {
            console.log('检测到棋牌房间二维码格式')
            try {
              const parts = res.result.replace('CHESS_ROOM:', '').split('|')
              if (parts.length >= 4) {
                const roomId = parts[0]
                const timestamp = parseInt(parts[3])
                const now = Date.now()
                const qrAge = now - timestamp
                const maxAge = 10 * 60 * 1000 // 10分钟有效期
                
                if (qrAge > maxAge) {
                  wx.showModal({
                    title: '二维码已过期',
                    content: '此二维码已超过10分钟，请向房主索取新的二维码',
                    showCancel: false
                  })
                  return
                }
                
                console.log('解析到房间ID:', roomId)
                this.joinRoomById(roomId)
                return
              }
            } catch (e) {
              console.log('简单格式解析失败:', e)
            }
          }
          
          // 方式3: 解析URL参数格式（兼容旧格式）
          try {
            const urlParams = new URLSearchParams(res.result.split('?')[1] || res.result)
            const roomId = urlParams.get('roomId')
            if (roomId) {
              console.log('URL参数格式解析成功，房间ID:', roomId)
              this.joinRoomById(roomId)
              return
            }
          } catch (e) {
            console.log('URL参数解析失败:', e)
          }
          
          // 方式4: 直接匹配房间号格式
          const roomIdMatch = res.result.match(/roomId[=:](\w+)/i)
          if (roomIdMatch) {
            const roomId = roomIdMatch[1]
            console.log('正则匹配成功，房间ID:', roomId)
            this.joinRoomById(roomId)
            return
          }
          
          // 如果所有解析方式都失败
          console.log('无法解析房间信息，二维码内容:', res.result)
          wx.showModal({
            title: '无效的二维码',
            content: '这不是有效的房间二维码，请扫描房主分享的二维码',
            showCancel: false
          })
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

  // 使用二维码中的完整房间数据加入房间
  joinRoomWithData(roomData) {
    // 显示加载提示
    wx.showLoading({
      title: '正在加入房间...',
      mask: true
    })
    
    // 检查本地是否已存在该房间
    let existingRoom = wx.getStorageSync(`room_${roomData.roomId}`)
    
    if (!existingRoom) {
      // 如果本地不存在房间，说明这是通过分享链接进入的
      // 需要创建一个基础房间结构，但不包含房主信息（房主信息应该由房主设备维护）
      console.log('本地不存在房间，创建基础房间结构')
      existingRoom = {
        roomId: roomData.roomId,
        name: roomData.name || `${roomData.gameType || '棋牌'}房间`,
        gameType: roomData.gameType || '其他',
        maxPlayers: roomData.maxPlayers || 8,
        initialScore: roomData.initialScore || 0,
        players: [], // 空的玩家列表，等待加入
        createTime: roomData.timestamp || Date.now(),
        isSharedRoom: true // 标记这是通过分享创建的房间
      }
      
      // 如果分享数据中包含房主信息，添加房主
      if (roomData.host) {
        const hostPlayer = {
          ...roomData.host,
          score: roomData.initialScore || 0,
          isHost: true,
          playerId: roomData.hostPlayerId || generatePlayerId()
        }
        existingRoom.host = roomData.host
        existingRoom.hostPlayerId = hostPlayer.playerId
        existingRoom.players.push(hostPlayer)
      }
      
      // 保存房间信息到本地
      wx.setStorageSync(`room_${roomData.roomId}`, existingRoom)
    }
    
    wx.hideLoading()
    
    // 显示房间信息确认
    wx.showModal({
      title: '确认加入房间',
      content: `房间名称：${existingRoom.name}\n游戏类型：${existingRoom.gameType}\n当前人数：${existingRoom.players.length}/${existingRoom.maxPlayers}`,
      confirmText: '加入',
      cancelText: '取消',
      success: (modalRes) => {
        if (modalRes.confirm) {
          // 检查房间是否已满
          if (existingRoom.players.length >= existingRoom.maxPlayers) {
            wx.showModal({
              title: '房间已满',
              content: `房间已达到最大人数限制(${existingRoom.maxPlayers}人)`,
              showCancel: false
            })
            return
          }
          
          // 跳转到房间页面
          wx.navigateTo({
            url: `/pages/room/room?roomId=${roomData.roomId}&isHost=false`,
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

// 添加工具方法
function generatePlayerId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 3)
}