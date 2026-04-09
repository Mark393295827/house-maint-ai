import { parseDiagnosis, ParsedDiagnosis } from '../../utils/diagnosisParser';

Page({
  data: {
    diagnosis: {} as ParsedDiagnosis
  },

  onLoad() {
    const rawResult = wx.getStorageSync('lastDiagnosis');
    if (rawResult) {
      const parsed = parseDiagnosis(rawResult);
      this.setData({ diagnosis: parsed });
    } else {
      wx.showToast({ title: 'No diagnosis found', icon: 'error' });
    }
  },

  handleMarkResolved() {
    wx.showToast({ title: 'Great job!', icon: 'success' });
    setTimeout(() => {
      wx.navigateBack({ delta: 2 });
    }, 1500);
  },

  handleViewMatch() {
    wx.showToast({ title: 'Tracking worker...', icon: 'loading' });
  }
});
