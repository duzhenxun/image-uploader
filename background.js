// 保存窗口ID
let windowId = null;

// 版本检查配置
const VERSION_CHECK = {
  // GitHub API地址
  url: 'https://api.github.com/repos/duzhenxun/image-uploader/releases/latest',
  // 检查间隔（24小时）
  interval: 24 * 60 * 60 * 1000
};

// 检查新版本
async function checkForUpdates() {
  try {
    const response = await fetch(VERSION_CHECK.url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error('GitHub API请求失败');
    }

    const data = await response.json();
    const latestVersion = data.tag_name.replace('v', ''); // 移除版本号前的'v'
    const currentVersion = chrome.runtime.getManifest().version;
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
      // 发现新版本，发送通知
      chrome.storage.local.set({
        updateAvailable: true,
        updateInfo: {
          version: latestVersion,
          notes: data.body,
          url: data.html_url
        }
      });
      
      // 如果窗口已打开，发送更新消息
      if (windowId !== null) {
        const views = await chrome.extension.getViews({ windowId });
        if (views.length > 0) {
          views[0].postMessage({ 
            type: 'UPDATE_AVAILABLE', 
            data: {
              version: latestVersion,
              notes: data.body,
              url: data.html_url
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
}

// 比较版本号
function compareVersions(a, b) {
  const pa = a.split('.');
  const pb = b.split('.');
  for (let i = 0; i < 3; i++) {
    const na = Number(pa[i]);
    const nb = Number(pb[i]);
    if (na > nb) return 1;
    if (nb > na) return -1;
    if (!isNaN(na) && isNaN(nb)) return 1;
    if (isNaN(na) && !isNaN(nb)) return -1;
  }
  return 0;
}

// 初始化版本检查
function initVersionCheck() {
  // 立即检查一次
  checkForUpdates();
  // 设置定期检查
  setInterval(checkForUpdates, VERSION_CHECK.interval);
}

// 检查窗口是否存在
async function checkWindow() {
  if (windowId !== null) {
    try {
      // 尝试获取窗口信息，如果窗口不存在会抛出错误
      const window = await chrome.windows.get(windowId);
      // 如果窗口存在但最小化了，将其恢复
      if (window.state === 'minimized') {
        chrome.windows.update(windowId, { state: 'normal' });
      }
      // 聚焦到窗口
      chrome.windows.update(windowId, { focused: true });
      return true;
    } catch (e) {
      // 窗口不存在，重置windowId
      windowId = null;
      return false;
    }
  }
  return false;
}

// 创建新窗口
async function createWindow() {
  const window = await chrome.windows.create({
    url: 'popup.html',
    type: 'panel',  // 使用panel类型，这样窗口会始终保持在最上层
    width: 450,
    height: 600,
    focused: true
  });
  windowId = window.id;
}

// 点击扩展图标时的处理
chrome.action.onClicked.addListener(async () => {
  const exists = await checkWindow();
  if (!exists) {
    await createWindow();
  }
});

// 监听窗口关闭事件
chrome.windows.onRemoved.addListener((removedWindowId) => {
  if (removedWindowId === windowId) {
    windowId = null;
  }
});

// 扩展安装或更新时
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装
    chrome.storage.local.set({ firstInstall: true });
  } else if (details.reason === 'update') {
    // 扩展更新
    chrome.storage.local.set({
      justUpdated: true,
      previousVersion: details.previousVersion
    });
  }
  // 初始化版本检查
  initVersionCheck();
});
