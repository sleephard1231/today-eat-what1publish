/**
 * 用户相关接口
 * 当前为 mock 状态，后端接入时替换 loginWithWechat 内部实现即可
 */

export function loginWithWechat(code) {
  // TODO: 后端接入后替换为真实请求
  // 真实接口类似：
  // return uni.request({
  //   url: 'https://your-backend.com/api/login',
  //   method: 'POST',
  //   data: { code }
  // })
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        openId: `mock_openid_${code}`,
        sessionKey: `mock_session_${code}`,
        token: `mock_token_${Date.now()}`
      })
    }, 300)
  })
}
