<template>
	<view class="custom-tabbar" :style="{ bottom: safeAreaHeight + 'rpx' }">
		<view 
			class="tabbar-item" 
			v-for="(item, index) in tabList" 
			:key="index"
			:class="{ active: currentPath === item.pagePath }"
			@click="switchTab(item.pagePath)">
			<view class="tabbar-icon">
				<uni-icons :type="item.icon" :color="currentPath === item.pagePath ? '#1296db' : '#999'" size="24"></uni-icons>
			</view>
			<view class="tabbar-text" :style="{color: currentPath === item.pagePath ? '#1296db' : '#999'}">{{item.text}}</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'CustomTabBar',
	data() {
		return {
			currentPath: '/pages/index/index',
			safeAreaHeight: 30,
			tabList: [
				{
					text: '首页', 
					icon: 'home',
					pagePath: '/pages/index/index'
				},
				{
					text: '我的',
					icon: 'person',
					pagePath: '/pages/my/my'
				}
			]
		}
	},
	created() {
		// 获取底部安全区高度
		uni.getSystemInfo({
			success: (res) => {
				console.log(res);
				if (res.safeAreaInsets) {
					this.safeAreaHeight = res.safeAreaInsets.bottom || 30;
				}
			}
		});
		
		// 初始获取当前页面路径
		this.updateCurrentPath();
	},
	onShow() {
		// 每次显示时更新路径
		this.updateCurrentPath();
	},
	// 监听页面显示
	mounted() {
		// 添加页面事件监听
		uni.$on('updateTabBar', this.updateCurrentPath);
	},
	// 组件销毁前移除事件监听
	beforeDestroy() {
		uni.$off('updateTabBar', this.updateCurrentPath);
	},
	methods: {
		// 更新当前路径
		updateCurrentPath() {
			const pages = getCurrentPages();
			if (pages.length > 0) {
				const currentPage = pages[pages.length - 1];
				this.currentPath = '/' + currentPage.route;
				console.log('当前路径:', this.currentPath);
			}
		},
		switchTab(path) {
			if (this.currentPath === path) return;
			uni.switchTab({
				url: path,
				success: () => {
					this.currentPath = path;
					// 触发全局事件，通知需要更新tabbar
					setTimeout(() => {
						uni.$emit('updateTabBar');
					}, 100);
				}
			});
		}
	}
}
</script>

<style>
.custom-tabbar {
	position: fixed;
	left: 50%;
	transform: translateX(-50%);
	bottom: 40rpx;
	width: 690rpx;
	height: 60px;
	background-color: #ffffff;
	border-radius: 30px;
	display: flex;
	padding-bottom: 10rpx;
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
	z-index: 999;
}

.tabbar-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	position: relative;
}

.tabbar-icon {
	margin-bottom: 2px;
}

.tabbar-text {
	font-size: 12px;
	transition: all 0.3s;
}

.tabbar-item::after {
	content: '';
	position: absolute;
	bottom: -5rpx;
	left: 50%;
	transform: translateX(-50%) scale(0);
	width: 30rpx;
	height: 3px;
	background-color: #1296db;
	border-radius: 3px;
	transition: all 0.3s;
}

.tabbar-item.active::after {
	transform: translateX(-50%) scale(1);
}
</style> 