<template>
  <view class="page">
    <view class="top-bar" :style="{ paddingTop: `${statusBarHeight + 12}px` }">
      <text class="back-text" @click="goBack">‹ 返回</text>
      <text class="top-title">{{ pageTitle }}</text>
      <text class="top-placeholder"></text>
    </view>
    <view class="content-wrap">
      <rich-text :nodes="content" />
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const statusBarHeight = uni.getWindowInfo().statusBarHeight || 20
const pageTitle = ref('')
const content = ref('')

const privacyContent = `
<h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">隐私政策</h2>
<p style="font-size:14px;line-height:2;color:#555;">
更新日期：2026年4月29日
</p>
<h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;">一、我们收集的信息</h3>
<p style="font-size:14px;line-height:2;color:#555;">
1. <b>微信登录信息</b>：当你选择微信登录时，我们会获取你的微信OpenID用于身份识别，获取头像和昵称用于展示个人资料。<br/>
2. <b>个人资料</b>：包括你主动填写的昵称、头像、MBTI类型、星座等偏好信息。<br/>
3. <b>校园入驻信息</b>：包括联系人姓名、联系方式（微信/手机号），仅用于校园入驻审核，审核完成后不会用于其他用途。<br/>
4. <b>使用记录</b>：你的推荐历史记录、每日使用次数等，用于提供更好的个性化服务。
</p>
<h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;">二、信息的使用</h3>
<p style="font-size:14px;line-height:2;color:#555;">
1. 提供和改善"今天吃什么"的推荐服务。<br/>
2. 根据你的MBTI和星座偏好，提供个性化美食推荐。<br/>
3. 处理校园入驻申请，进行审核反馈。<br/>
4. 在你授权的前提下，将数据同步至云端，实现跨设备使用。
</p>
<h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;">三、信息的存储与保护</h3>
<p style="font-size:14px;line-height:2;color:#555;">
1. 你的数据通过uniCloud云服务存储，采用行业标准的安全措施保护。<br/>
2. 联系方式等敏感信息仅用于入驻审核，不会向第三方披露。<br/>
3. 你可以随时在"我的"页面退出登录，退出后本地缓存会清除。
</p>
<h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;">四、你的权利</h3>
<p style="font-size:14px;line-height:2;color:#555;">
1. 你有权拒绝提供个人信息，但可能影响部分功能的使用。<br/>
2. 你有权随时查看、更正你的个人资料。<br/>
3. 你有权要求删除你的个人信息，可通过退出登录实现。
</p>
<h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;">五、联系我们</h3>
<p style="font-size:14px;line-height:2;color:#555;">
如你对本隐私政策有任何疑问，可通过小程序内的反馈渠道联系我们。
</p>
`

const agreementContent = `
<h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">用户协议</h2>
<p style="font-size:14px;line-height:2;color:#555;">
更新日期：2026年4月29日
</p>
<h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;">一、服务说明</h3>
<p style="font-size:14px;line-height:2;color:#555;">
"今天吃什么"是一款基于MBTI和星座偏好的美食推荐小程序，为用户提供个性化的就餐建议。本服务仅供参考，不构成任何专业性建议。
</p>
<h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;">二、使用规范</h3>
<p style="font-size:14px;line-height:2;color:#555;">
1. 你应当合法、合规地使用本小程序，不得利用本服务从事违法违规活动。<br/>
2. 你在校园入驻申请中填写的信息应当真实有效，不得冒用他人身份。<br/>
3. 你不得通过任何技术手段干扰本服务的正常运行。
</p>
<h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;">三、免责声明</h3>
<p style="font-size:14px;line-height:2;color:#555;">
1. 推荐结果仅供参考，不构成饮食、健康或任何专业建议。<br/>
2. 因不可抗力、技术故障等原因导致服务中断的，我们不承担责任。<br/>
3. 你使用本服务所产生的一切风险由你自行承担。
</p>
<h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;">四、知识产权</h3>
<p style="font-size:14px;line-height:2;color:#555;">
本小程序的所有内容（包括但不限于文字、图片、代码、界面设计）均受知识产权法保护，未经授权不得复制、修改或传播。
</p>
<h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;">五、协议修改</h3>
<p style="font-size:14px;line-height:2;color:#555;">
我们有权根据法律法规变化或业务需要修改本协议，修改后的协议将在小程序内公示。继续使用本服务即视为同意修改后的协议。
</p>
`

onLoad((options) => {
  const type = options?.url || 'privacy'
  if (type === 'privacy') {
    pageTitle.value = '隐私政策'
    content.value = privacyContent
  } else {
    pageTitle.value = '用户协议'
    content.value = agreementContent
  }
})

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  background: #faf8f6;
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 24rpx;
  padding-right: 24rpx;
}
.back-text, .top-placeholder {
  width: 120rpx;
  color: #8a7b6e;
  font-size: 28rpx;
}
.top-title {
  color: #2f241c;
  font-size: 34rpx;
  font-weight: 700;
}
.content-wrap {
  padding: 24rpx 32rpx 60rpx;
}
</style>
