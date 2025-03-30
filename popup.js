document.addEventListener('DOMContentLoaded', function() {
  // 存储设置
  let settings = {
    serviceType: 'custom',
    imgur: {
      clientId: ''
    },
    custom: {
      uploadUrl: '',
      responsePath: ''
    }
  };

  // DOM元素
  const elements = {
    mainView: document.getElementById('mainView'),
    settingsView: document.getElementById('settingsView'),
    settingsBtn: document.getElementById('settingsBtn'),
    closeBtn: document.getElementById('closeBtn'),
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    uploadList: document.getElementById('uploadList'),
    serviceType: document.getElementById('serviceType'),
    imgurSettings: document.getElementById('imgurSettings'),
    customSettings: document.getElementById('customSettings'),
    imgurClientId: document.getElementById('imgurClientId'),
    customUploadUrl: document.getElementById('customUploadUrl'),
    customResponsePath: document.getElementById('customResponsePath'),
    saveSettings: document.getElementById('saveSettings'),
    updateBanner: document.getElementById('updateBanner'),
    updateVersion: document.getElementById('updateVersion'),
    updateBtn: document.getElementById('updateBtn'),
    updateCloseBtn: document.getElementById('updateCloseBtn')
  };

  // 初始化
  async function init() {
    loadSettings();
    setupEventListeners();
    checkForUpdates();
  }

  // 加载设置
  async function loadSettings() {
    const savedSettings = await chrome.storage.local.get('settings');
    if (savedSettings.settings) {
      settings = savedSettings.settings;
      updateSettingsUI();
    }
  }

  // 更新设置UI
  function updateSettingsUI() {
    elements.serviceType.value = settings.serviceType;
    elements.imgurClientId.value = settings.imgur.clientId;
    elements.customUploadUrl.value = settings.custom.uploadUrl;
    elements.customResponsePath.value = settings.custom.responsePath;
    updateServiceSettingsVisibility();
  }

  // 更新服务设置可见性
  function updateServiceSettingsVisibility() {
    elements.imgurSettings.style.display = settings.serviceType === 'imgur' ? 'block' : 'none';
    elements.customSettings.style.display = settings.serviceType === 'custom' ? 'block' : 'none';
  }

  // 保存设置
  async function saveSettings() {
    settings = {
      serviceType: elements.serviceType.value,
      imgur: {
        clientId: elements.imgurClientId.value.trim()
      },
      custom: {
        uploadUrl: elements.customUploadUrl.value.trim(),
        responsePath: elements.customResponsePath.value.trim()
      }
    };
  
    await chrome.storage.local.set({ settings });
    showMainView();
  }

  // 设置事件监听器
  function setupEventListeners() {
    // 视图切换
    elements.settingsBtn.addEventListener('click', showSettingsView);
    elements.closeBtn.addEventListener('click', () => window.close());
    elements.serviceType.addEventListener('change', updateServiceSettingsVisibility);
    elements.saveSettings.addEventListener('click', saveSettings);

    // 文件上传相关
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);
    document.addEventListener('paste', handlePaste);

    // 更新相关
    elements.updateBtn.addEventListener('click', handleUpdate);
    elements.updateCloseBtn.addEventListener('click', () => elements.updateBanner.style.display = 'none');
  }

  // 显示设置视图
  function showSettingsView() {
    elements.mainView.style.display = 'none';
    elements.settingsView.style.display = 'block';
  }

  // 显示主视图
  function showMainView() {
    elements.mainView.style.display = 'block';
    elements.settingsView.style.display = 'none';
  }

  // 处理文件拖放
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.classList.add('dragover');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.classList.remove('dragover');
  
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(Array.from(files));
    }
  }

  // 处理文件选择
  function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      handleFiles(Array.from(files));
    }
  }

  // 处理粘贴
  async function handlePaste(e) {
    const items = e.clipboardData.items;
    const files = [];
  
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }
  
    if (files.length > 0) {
      handleFiles(files);
    }
  }

  // 处理文件上传
  async function handleFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue;
      }
    
      const uploadItem = createUploadItem(file);
      elements.uploadList.insertBefore(uploadItem.element, elements.uploadList.firstChild);
    
      try {
        const url = await uploadFile(file, uploadItem);
        updateUploadItemSuccess(uploadItem, url);
      } catch (error) {
        updateUploadItemError(uploadItem, error.message);
      }
    }
  }

  // 创建上传项UI
  function createUploadItem(file) {
    const element = document.createElement('div');
    element.className = 'upload-item';
  
    const info = document.createElement('div');
    info.className = 'info';
  
    const fileName = document.createElement('div');
    fileName.className = 'filename';
    fileName.textContent = file.name;
  
    const url = document.createElement('div');
    url.className = 'url';
    url.style.display = 'none';
  
    info.appendChild(fileName);
    info.appendChild(url);
  
    const status = document.createElement('div');
    status.className = 'status';
    status.textContent = '上传中...';
  
    const progress = document.createElement('div');
    progress.className = 'progress';
  
    element.appendChild(info);
    element.appendChild(status);
    element.appendChild(progress);
  
    return { element, status, progress, url };
  }

  // 更新上传成功状态
  function updateUploadItemSuccess(uploadItem, imageUrl) {
    uploadItem.element.classList.remove('error');
    uploadItem.status.textContent = '点击复制';
    uploadItem.progress.style.width = '100%';
  
    // 显示URL
    uploadItem.url.textContent = imageUrl;
    uploadItem.url.style.display = 'block';
  
    uploadItem.element.addEventListener('click', () => {
      navigator.clipboard.writeText(imageUrl);
      uploadItem.status.textContent = '已复制';
      setTimeout(() => {
        uploadItem.status.textContent = '点击复制';
      }, 1000);
    });
  }

  // 更新上传错误状态
  function updateUploadItemError(uploadItem, error) {
    uploadItem.element.classList.add('error');
    uploadItem.status.textContent = `错误: ${error}`;
    uploadItem.progress.style.width = '100%';
  }

  // 上传文件
  async function uploadFile(file, uploadItem) {
    if (settings.serviceType === 'imgur') {
      return await uploadToImgur(file, uploadItem);
    } else {
      return await uploadToCustom(file, uploadItem);
    }
  }

  // 上传到Imgur
  async function uploadToImgur(file, uploadItem) {
    if (!settings.imgur.clientId) {
      throw new Error('请先配置Imgur Client ID');
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': `Client-ID ${settings.imgur.clientId}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Imgur上传失败');
    }

    const data = await response.json();
    return data.data.link;
  }

  // 上传到自定义图床
  async function uploadToCustom(file, uploadItem) {
    if (!settings.custom.uploadUrl) {
      throw new Error('请先配置上传地址');
    }

    try {
      console.log('开始上传到自定义图床:', settings.custom.uploadUrl);
      
      // 创建FormData
      const formData = new FormData();
      formData.append('file', file);

      // 将文件转换为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // 发送消息给background script处理上传
      const response = await chrome.runtime.sendMessage({
        type: 'uploadImage',
        data: {
          url: settings.custom.uploadUrl,
          filename: file.name,
          contentType: file.type,
          data: Array.from(new Uint8Array(arrayBuffer))
        }
      });

      console.log('上传响应:', response);

      if (!response.success) {
        throw new Error(response.error || '上传失败');
      }

      let data;
      try {
        data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      } catch (e) {
        throw new Error('服务器返回的不是有效的JSON格式');
      }

      if (!settings.custom.responsePath) {
        if (typeof data === 'string') {
          return data;
        }
        throw new Error('未配置返回URL路径，且返回内容不是直接的URL字符串');
      }

      const url = getValueByPath(data, settings.custom.responsePath);
      if (!url) {
        throw new Error(`在返回数据中未找到指定路径 ${settings.custom.responsePath} 的URL`);
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('返回的URL格式不正确，必须以http://或https://开头');
      }

      return url;
    } catch (error) {
      console.error('上传错误:', error);
      throw new Error(`上传失败: ${error.message}`);
    }
  }

  // 根据路径获取对象值
  function getValueByPath(obj, path) {
    if (!path) {
      return obj;
    }
    
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        throw new Error(`路径 ${path} 中的 ${key} 不存在`);
      }
      result = result[key];
    }
    
    if (typeof result !== 'string') {
      throw new Error(`路径 ${path} 的值不是字符串: ${JSON.stringify(result)}`);
    }
    
    return result;
  }

  // 检查更新
  async function checkForUpdates() {
    try {
      const response = await fetch('version.json');
      const versionInfo = await response.json();
    
      const manifest = chrome.runtime.getManifest();
      if (versionInfo.version !== manifest.version) {
        elements.updateVersion.textContent = versionInfo.version;
        elements.updateBanner.style.display = 'block';
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  }

  // 处理更新
  function handleUpdate() {
    chrome.runtime.reload();
  }

  // 启动应用
  init();
});
