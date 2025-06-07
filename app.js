App({
  globalData: {
    userInfo: null,
    roomInfo: null,
    players: []
  },
  
  onLaunch() {
    // 获取用户信息
    this.getUserInfo();
  },
  
  getUserInfo() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        this.globalData.userInfo = res.userInfo;
      },
      fail: () => {
        console.log('获取用户信息失败');
      }
    });
  }
})