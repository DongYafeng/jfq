App({
  globalData: {
    userInfo: null,
    roomInfo: null,
    players: []
  },
  
  onLaunch() {
    console.log('小程序启动')
    // 获取用户信息
    this.getUserInfo();
  },
  
  getUserInfo() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        console.log('获取用户信息成功:', res.userInfo)
        this.globalData.userInfo = res.userInfo;
      },
      fail: () => {
        console.log('获取用户信息失败')
        // 静默失败，不显示错误信息
        // 用户可以在需要时再次授权
      }
    });
  }
})