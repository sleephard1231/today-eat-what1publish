<script>
import { ensureAppState } from '@/utils/app-state.js'
import { agreePrivacy, hasAgreedPrivacy } from '@/utils/privacy-state.js'

export default {
  onLaunch() {
    ensureAppState()
    this.showPrivacyModal()
  },
  onShow() {
    ensureAppState()
  },
  methods: {
    showPrivacyModal() {
      if (hasAgreedPrivacy()) return

      uni.showModal({
        title: '隐私保护提示',
        content: '我们会使用登录信息、头像昵称、推荐历史和入驻申请信息来提供服务。请先阅读并同意隐私政策和用户协议。',
        confirmText: '同意',
        cancelText: '先不了',
        success: (res) => {
          if (res.confirm) {
            agreePrivacy()
          }
        }
      })
    }
  }
}
</script>

<style lang="scss">
page {
  background: #fffaf3;
  color: #3d2f24;
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

view,
text,
button,
input,
textarea {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
}

button::after {
  border: 0;
}
</style>
