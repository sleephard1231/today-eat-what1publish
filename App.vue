<script>
import { ensureAppState } from '@/utils/app-state.js'

export default {
  onLaunch() {
    ensureAppState()
  },
  onShow() {
    ensureAppState()
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
