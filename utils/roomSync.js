// roomSync.js - 房间数据同步工具
// 模拟云端数据同步功能

class RoomSync {
  constructor() {
    this.syncInterval = null
    this.roomId = null
    this.isHost = false
    this.syncCallbacks = []
  }

  // 初始化房间同步
  initSync(roomId, isHost = false) {
    this.roomId = roomId
    this.isHost = isHost
    
    console.log(`初始化房间同步: ${roomId}, 是否房主: ${isHost}`)
    
    // 如果是房主，定期广播房间数据
    if (isHost) {
      this.startHostBroadcast()
    } else {
      // 如果不是房主，定期同步房间数据
      this.startGuestSync()
    }
  }

  // 房主广播房间数据
  startHostBroadcast() {
    // 立即广播一次
    this.broadcastRoomData()
    
    // 每5秒广播一次房间数据
    this.syncInterval = setInterval(() => {
      this.broadcastRoomData()
    }, 5000)
  }

  // 客人同步房间数据
  startGuestSync() {
    // 立即同步一次
    this.syncRoomData()
    
    // 每3秒同步一次房间数据
    this.syncInterval = setInterval(() => {
      this.syncRoomData()
    }, 3000)
  }

  // 广播房间数据（房主使用）
  broadcastRoomData() {
    if (!this.roomId) return
    
    const roomData = wx.getStorageSync(`room_${this.roomId}`)
    if (!roomData) return
    
    // 添加同步时间戳
    roomData.lastSync = Date.now()
    roomData.syncVersion = (roomData.syncVersion || 0) + 1
    
    // 保存到"云端"存储（使用特殊的key模拟）
    wx.setStorageSync(`cloud_room_${this.roomId}`, roomData)
    
    console.log(`房主广播房间数据: ${this.roomId}, 版本: ${roomData.syncVersion}`)
  }

  // 同步房间数据（客人使用）
  syncRoomData() {
    if (!this.roomId) return
    
    try {
      // 从"云端"获取最新房间数据
      const cloudRoomData = wx.getStorageSync(`cloud_room_${this.roomId}`)
      if (!cloudRoomData) {
        console.log('云端暂无房间数据')
        return
      }
      
      // 获取本地房间数据
      const localRoomData = wx.getStorageSync(`room_${this.roomId}`)
      
      // 比较版本，如果云端数据更新，则同步
      if (!localRoomData || !localRoomData.syncVersion || 
          cloudRoomData.syncVersion > localRoomData.syncVersion) {
        
        console.log(`同步房间数据: 本地版本 ${localRoomData?.syncVersion || 0} -> 云端版本 ${cloudRoomData.syncVersion}`)
        
        // 保留当前用户的playerId
        const currentPlayerId = localRoomData?.currentPlayerId
        
        // 合并数据：保留本地用户信息，同步其他玩家信息
        const mergedData = this.mergeRoomData(localRoomData, cloudRoomData, currentPlayerId)
        
        // 更新本地存储
        wx.setStorageSync(`room_${this.roomId}`, mergedData)
        
        // 通知页面更新
        this.notifyDataUpdate(mergedData)
      }
    } catch (error) {
      console.error('同步房间数据失败:', error)
    }
  }

  // 合并房间数据
  mergeRoomData(localData, cloudData, currentPlayerId) {
    // 以云端数据为基础
    const mergedData = { ...cloudData }
    
    // 如果本地有当前用户信息，确保保留
    if (localData && currentPlayerId) {
      const localCurrentPlayer = localData.players?.find(p => p.playerId === currentPlayerId)
      if (localCurrentPlayer) {
        // 在云端数据中查找或添加当前用户
        const cloudPlayerIndex = mergedData.players.findIndex(p => p.playerId === currentPlayerId)
        if (cloudPlayerIndex >= 0) {
          // 更新云端数据中的当前用户信息
          mergedData.players[cloudPlayerIndex] = { ...mergedData.players[cloudPlayerIndex], ...localCurrentPlayer }
        } else {
          // 如果云端数据中没有当前用户，添加进去
          mergedData.players.push(localCurrentPlayer)
        }
      }
      
      // 保留当前用户ID
      mergedData.currentPlayerId = currentPlayerId
    }
    
    return mergedData
  }

  // 添加数据更新回调
  onDataUpdate(callback) {
    this.syncCallbacks.push(callback)
  }

  // 通知数据更新
  notifyDataUpdate(roomData) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(roomData)
      } catch (error) {
        console.error('数据更新回调执行失败:', error)
      }
    })
  }

  // 手动触发同步
  forcSync() {
    if (this.isHost) {
      this.broadcastRoomData()
    } else {
      this.syncRoomData()
    }
  }

  // 更新玩家信息
  updatePlayer(playerId, playerData) {
    if (!this.roomId) return
    
    const roomData = wx.getStorageSync(`room_${this.roomId}`)
    if (!roomData) return
    
    const playerIndex = roomData.players.findIndex(p => p.playerId === playerId)
    if (playerIndex >= 0) {
      roomData.players[playerIndex] = { ...roomData.players[playerIndex], ...playerData }
      
      // 更新本地存储
      wx.setStorageSync(`room_${this.roomId}`, roomData)
      
      // 如果是房主，立即广播
      if (this.isHost) {
        this.broadcastRoomData()
      }
    }
  }

  // 添加新玩家
  addPlayer(playerData) {
    if (!this.roomId) return
    
    const roomData = wx.getStorageSync(`room_${this.roomId}`)
    if (!roomData) return
    
    // 检查玩家是否已存在
    const existingPlayer = roomData.players.find(p => p.playerId === playerData.playerId)
    if (!existingPlayer) {
      roomData.players.push(playerData)
      
      // 更新本地存储
      wx.setStorageSync(`room_${this.roomId}`, roomData)
      
      // 如果是房主，立即广播
      if (this.isHost) {
        this.broadcastRoomData()
      }
    }
  }

  // 停止同步
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    
    this.roomId = null
    this.isHost = false
    this.syncCallbacks = []
    
    console.log('房间同步已停止')
  }

  // 清理房间数据
  cleanupRoom(roomId) {
    try {
      // 清理本地数据
      wx.removeStorageSync(`room_${roomId}`)
      wx.removeStorageSync(`history_${roomId}`)
      
      // 清理云端数据（仅房主）
      if (this.isHost) {
        wx.removeStorageSync(`cloud_room_${roomId}`)
      }
      
      console.log(`房间数据已清理: ${roomId}`)
    } catch (error) {
      console.error('清理房间数据失败:', error)
    }
  }
}

// 创建全局实例
const roomSync = new RoomSync()

module.exports = roomSync 