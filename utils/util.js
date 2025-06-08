const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// 生成房间ID
const generateRoomId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

// 生成玩家ID
const generatePlayerId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 3)
}

// 格式化分数显示
const formatScore = (score) => {
  if (score >= 0) {
    return `+${score}`
  }
  return score.toString()
}

// 获取游戏类型配置
const getGameConfig = (gameType) => {
  const configs = {
    '掼蛋': {
      maxPlayers: 4,
      initialScore: 0,
      description: '四人对战经典游戏'
    },
    '斗地主': {
      maxPlayers: 3,
      initialScore: 0,
      description: '三人对战经典游戏'
    },
    '扑克': {
      maxPlayers: 8,
      initialScore: 0,
      description: '多人扑克游戏'
    },
    '其他': {
      maxPlayers: 8,
      initialScore: 0,
      description: '自定义游戏类型'
    }
  }
  
  return configs[gameType] || configs['其他']
}

// 验证房间数据
const validateRoomData = (roomData) => {
  if (!roomData || typeof roomData !== 'object') {
    return false
  }
  
  const requiredFields = ['roomId', 'name', 'gameType', 'players']
  return requiredFields.every(field => roomData.hasOwnProperty(field))
}

// 存储工具
const storage = {
  set: (key, data) => {
    try {
      wx.setStorageSync(key, data)
      return true
    } catch (error) {
      console.error('存储失败:', error)
      return false
    }
  },
  
  get: (key, defaultValue = null) => {
    try {
      const data = wx.getStorageSync(key)
      return data || defaultValue
    } catch (error) {
      console.error('读取存储失败:', error)
      return defaultValue
    }
  },
  
  remove: (key) => {
    try {
      wx.removeStorageSync(key)
      return true
    } catch (error) {
      console.error('删除存储失败:', error)
      return false
    }
  }
}

// 显示提示信息
const showToast = (title, icon = 'none', duration = 2000) => {
  wx.showToast({
    title,
    icon,
    duration
  })
}

// 显示确认对话框
const showModal = (title, content) => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

module.exports = {
  formatTime,
  formatNumber,
  generateId,
  generateRoomId,
  generatePlayerId,
  formatScore,
  getGameConfig,
  validateRoomData,
  storage,
  showToast,
  showModal
} 