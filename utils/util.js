// 工具函数
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

// 验证房间数据
const validateRoomData = (data) => {
  if (!data || typeof data !== 'object') {
    return false
  }
  
  return !!(data.type === 'chess-room' && data.roomId)
}

// 格式化分数显示
const formatScore = (score) => {
  if (score >= 0) {
    return `+${score}`
  }
  return score.toString()
}

// 计算总分
const calculateTotalScore = (players) => {
  return players.reduce((total, player) => total + player.score, 0)
}

// 获取排行榜
const getRanking = (players) => {
  return [...players].sort((a, b) => b.score - a.score)
}

module.exports = {
  formatTime,
  generateId,
  generateRoomId,
  validateRoomData,
  formatScore,
  calculateTotalScore,
  getRanking
}