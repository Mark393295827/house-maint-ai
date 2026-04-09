import { diagnose } from '../../utils/api';

const recorderManager = wx.getRecorderManager();
const MAX_RECORD_TIME = 60000;

Page({
  data: {
    imagePath: '',
    imageBase64: '',
    imageMimeType: '',
    isRecording: false,
    audioPath: '',
    duration: 0,
    isDiagnosing: false,
    recordStartTime: 0
  },

  onLoad() {
    recorderManager.onStop((res) => {
      this.setData({
        audioPath: res.tempFilePath,
        isRecording: false,
        duration: Math.round((Date.now() - this.data.recordStartTime) / 1000)
      });
      wx.showToast({ title: 'Audio Saved', icon: 'success' });
    });
  },

  async handleChooseMedia() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        camera: 'back'
      });

      if (res.tempFiles && res.tempFiles.length > 0) {
        const file = res.tempFiles[0];
        
        // Read file to base64 for API
        const fs = wx.getFileSystemManager();
        const base64Data = fs.readFileSync(file.tempFilePath, 'base64') as string;
        
        let mimeType = 'image/jpeg';
        if (file.tempFilePath.endsWith('.png')) mimeType = 'image/png';
        if (file.tempFilePath.endsWith('.webp')) mimeType = 'image/webp';

        this.setData({
          imagePath: file.tempFilePath,
          imageBase64: base64Data,
          imageMimeType: mimeType
        });
      }
    } catch (err) {
      console.error('Media upload failed', err);
    }
  },

  startRecord() {
    this.setData({ isRecording: true, recordStartTime: Date.now() });
    recorderManager.start({
      duration: MAX_RECORD_TIME,
      format: 'mp3'
    });
  },

  stopRecord() {
    recorderManager.stop();
  },

  async handleSubmit() {
    if (!this.data.imageBase64) {
      return wx.showToast({ title: 'Please add a photo', icon: 'none' });
    }

    this.setData({ isDiagnosing: true });

    try {
      // PIPL Blur inherently handled by backend middleware on this route
      const result = await diagnose(
        this.data.imageBase64,
        this.data.imageMimeType,
        this.data.audioPath ? 'User attached voice description' : ''
      );

      // Pass result to diagnosis page
      wx.setStorageSync('lastDiagnosis', result);
      
      wx.navigateTo({
        url: '/pages/report/diagnosis'
      });
      
    } catch (err) {
      console.error('Diagnosis error', err);
      wx.showToast({ title: 'Diagnosis Failed', icon: 'error' });
    } finally {
      this.setData({ isDiagnosing: false });
    }
  }
});
