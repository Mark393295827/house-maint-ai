App<IAppOption>({
  globalData: {
    token: '',
    userInfo: null,
  },
  onLaunch() {
    // Check if token exists in local storage
    const token = wx.getStorageSync('accessToken');
    if (token) {
      this.globalData.token = token;
    }
  },
})
