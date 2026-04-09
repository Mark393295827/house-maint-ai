const BASE_URL = 'http://localhost:3000/api';

export const request = async (url: string, options: WechatMiniprogram.RequestOption = {}): Promise<any> => {
  const token = wx.getStorageSync('accessToken');
  const header = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.header || {})
  };

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      ...options,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail: reject
    });
  });
};

export const login = async (code: string) => {
  return request('/wechat/login', {
    method: 'POST',
    data: { code }
  });
};

export const diagnose = async (image: string, mimeType: string, text?: string) => {
  return request('/ai/diagnose', {
    method: 'POST',
    data: { image, mimeType, text }
  });
};
