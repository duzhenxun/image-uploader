document.addEventListener('DOMContentLoaded', function() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadList = document.getElementById('uploadList');
  const settingsBtn = document.getElementById('settingsBtn');
  const closeBtn = document.getElementById('closeBtn');
  const mainView = document.getElementById('mainView');
  const settingsView = document.getElementById('settingsView');
  const serviceType = document.getElementById('serviceType');
  const saveSettings = document.getElementById('saveSettings');
  
  // 更新相关元素
  const updateBanner = document.getElementById('updateBanner');
  const updateVersion = document.getElementById('updateVersion');
  const updateBtn = document.getElementById('updateBtn');
  const updateCloseBtn = document.getElementById('updateCloseBtn');

  // 关闭按钮
  closeBtn.addEventListener('click', () => {
    window.close();
  });

  // 配置视图切换
  settingsBtn.addEventListener('click', () => {
    if (settingsView.style.display === 'none') {
      mainView.style.display = 'none';
      settingsView.style.display = 'block';
      loadSettings();
    } else {
      mainView.style.display = 'block';
      settingsView.style.display = 'none';
    }
  });

  // 服务类型切换
  serviceType.addEventListener('change', () => {
    document.querySelectorAll('.service-config').forEach(config => {
      config.style.display = 'none';
    });
    document.getElementById(`${serviceType.value}Config`).style.display = 'block';
  });

  // 保存设置
  saveSettings.addEventListener('click', () => {
    const settings = {
      service: serviceType.value,
      config: {}
    };

    switch (serviceType.value) {
      case 'aliyun':
        settings.config = {
          accessKey: document.getElementById('aliyunAccessKey').value,
          secretKey: document.getElementById('aliyunSecretKey').value,
          bucket: document.getElementById('aliyunBucket').value,
          region: document.getElementById('aliyunRegion').value
        };
        break;
      case 'qiniu':
        settings.config = {
          accessKey: document.getElementById('qiniuAccessKey').value,
          secretKey: document.getElementById('qiniuSecretKey').value,
          bucket: document.getElementById('qiniuBucket').value,
          domain: document.getElementById('qiniuDomain').value
        };
        break;
      case 'imgur':
        settings.config = {
          clientId: document.getElementById('imgurClientId').value
        };
        break;
      case 'custom':
        settings.config = {
          apiUrl: document.getElementById('customApiUrl').value,
          headers: document.getElementById('customHeaders').value,
          responsePath: document.getElementById('customResponsePath').value
        };
        break;
    }

    chrome.storage.sync.set({ settings }, () => {
      alert('设置已保存');
      mainView.style.display = 'block';
      settingsView.style.display = 'none';
    });
  });

  // 加载设置
  function loadSettings() {
    chrome.storage.sync.get('settings', (data) => {
      if (data.settings) {
        serviceType.value = data.settings.service;
        serviceType.dispatchEvent(new Event('change'));

        const config = data.settings.config;
        switch (data.settings.service) {
          case 'aliyun':
            document.getElementById('aliyunAccessKey').value = config.accessKey || '';
            document.getElementById('aliyunSecretKey').value = config.secretKey || '';
            document.getElementById('aliyunBucket').value = config.bucket || '';
            document.getElementById('aliyunRegion').value = config.region || '';
            break;
          case 'qiniu':
            document.getElementById('qiniuAccessKey').value = config.accessKey || '';
            document.getElementById('qiniuSecretKey').value = config.secretKey || '';
            document.getElementById('qiniuBucket').value = config.bucket || '';
            document.getElementById('qiniuDomain').value = config.domain || '';
            break;
          case 'imgur':
            document.getElementById('imgurClientId').value = config.clientId || '';
            break;
          case 'custom':
            document.getElementById('customApiUrl').value = config.apiUrl || '';
            document.getElementById('customHeaders').value = config.headers || '';
            document.getElementById('customResponsePath').value = config.responsePath || '';
            break;
        }
      }
    });
  }

  // 检查是否有更新
  chrome.storage.local.get(['updateAvailable', 'updateInfo'], function(result) {
    if (result.updateAvailable && result.updateInfo) {
      showUpdateBanner(result.updateInfo);
    }
  });

  // 监听来自background的更新消息
  window.addEventListener('message', function(event) {
    if (event.data.type === 'UPDATE_AVAILABLE') {
      showUpdateBanner(event.data.data);
    }
  });

  // 显示更新横幅
  function showUpdateBanner(updateInfo) {
    updateVersion.textContent = `v${updateInfo.version}`;
    updateBanner.style.display = 'flex';
    
    // 更新按钮点击事件
    updateBtn.onclick = function() {
      window.open(updateInfo.url, '_blank');
    };
    
    // 关闭按钮点击事件
    updateCloseBtn.onclick = function() {
      updateBanner.style.display = 'none';
      // 24小时内不再显示
      chrome.storage.local.set({
        updateDismissed: Date.now()
      });
    };
  }

  // 文件拖放处理
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#666';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#ccc';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#ccc';
    handleFiles(Array.from(e.dataTransfer.files));
  });

  // 点击上传
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    handleFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  // 粘贴上传
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    const files = [];
    
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        files.push(file);
      }
    }
    
    if (files.length > 0) {
      handleFiles(files);
    }
  });

  // 处理文件上传
  async function handleFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue;
      }

      const item = createUploadItem(file);
      uploadList.insertBefore(item, uploadList.firstChild);

      try {
        const url = await uploadFile(file);
        updateUploadItem(item, url);
      } catch (error) {
        updateUploadItem(item, null, error.message);
      }
    }
  }

  // 创建上传项
  function createUploadItem(file) {
    const item = document.createElement('div');
    item.className = 'upload-item';
    item.innerHTML = `
      <img src="${URL.createObjectURL(file)}">
      <div class="url">上传中...</div>
    `;
    return item;
  }

  // 更新上传项
  function updateUploadItem(item, url, error) {
    if (url) {
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.value = url;
      urlInput.readOnly = true;
      
      const copyBtn = document.createElement('button');
      copyBtn.textContent = '复制';
      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(url);
          const originalText = copyBtn.textContent;
          copyBtn.textContent = '已复制!';
          setTimeout(() => {
            copyBtn.textContent = originalText;
          }, 1500);
        } catch (err) {
          console.error('复制失败:', err);
          alert('复制失败，请手动复制');
        }
      };

      const urlContainer = item.querySelector('.url');
      urlContainer.innerHTML = '';
      urlContainer.appendChild(urlInput);
      urlContainer.appendChild(copyBtn);
    } else {
      item.querySelector('.url').innerHTML = `
        <span style="color: red;">上传失败: ${error}</span>
      `;
    }
  }

  // 上传文件
  async function uploadFile(file) {
    const settings = await new Promise((resolve) => {
      chrome.storage.sync.get('settings', (data) => resolve(data.settings));
    });

    if (!settings) {
      throw new Error('请先配置图床设置');
    }

    switch (settings.service) {
      case 'aliyun':
        return await uploadToAliyun(file, settings.config);
      case 'qiniu':
        return await uploadToQiniu(file, settings.config);
      case 'imgur':
        return await uploadToImgur(file, settings.config);
      case 'custom':
        return await uploadToCustom(file, settings.config);
      default:
        throw new Error('不支持的图床服务');
    }
  }

  // 阿里云上传
  async function uploadToAliyun(file, config) {
    const client = new OSS({
      accessKeyId: config.accessKey,
      accessKeySecret: config.secretKey,
      bucket: config.bucket,
      region: config.region
    });

    const fileName = `${Date.now()}-${file.name}`;
    try {
      const result = await client.put(fileName, file);
      return result.url;
    } catch (error) {
      throw new Error(`阿里云上传失败: ${error.message}`);
    }
  }

  // 七牛云上传
  async function uploadToQiniu(file, config) {
    try {
      // 使用七牛云SDK生成上传凭证（仅用于测试，生产环境建议使用后端生成）
      const putPolicy = {
        scope: config.bucket,
        deadline: Math.floor(Date.now() / 1000) + 3600 // 1小时有效期
      };
      
      // 计算上传凭证
      const accessKey = config.accessKey;
      const secretKey = config.secretKey;
      const put_policy = JSON.stringify(putPolicy);
      const encoded = btoa(put_policy);
      const signed = CryptoJS.HmacSHA1(encoded, secretKey);
      const encodedSign = signed.toString(CryptoJS.enc.Base64);
      const uploadToken = `${accessKey}:${encodedSign}:${encoded}`;

      const fileName = `${Date.now()}-${file.name}`;
      const observable = qiniu.upload(file, fileName, uploadToken, {}, {
        useCdnDomain: true,
        region: null // 自动检测上传区域
      });
      
      return new Promise((resolve, reject) => {
        observable.subscribe({
          next: (res) => {
            // 上传进度，可以在这里添加进度显示
            console.log('上传进度:', res.total.percent);
          },
          error: (err) => {
            reject(new Error(`七牛云上传失败: ${err.message}`));
          },
          complete: (res) => {
            const url = `${config.domain}/${res.key}`;
            resolve(url);
          }
        });
      });
    } catch (error) {
      throw new Error(`七牛云上传失败: ${error.message}`);
    }
  }

  // Imgur上传
  async function uploadToImgur(file, config) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': `Client-ID ${config.clientId}`
      },
      body: formData
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.data.error);
    }

    return data.data.link;
  }

  // 自定义图床上传
  async function uploadToCustom(file, config) {
    try {
      const headers = JSON.parse(config.headers || '{}');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await response.json();
      const url = config.responsePath.split('.').reduce((obj, key) => obj[key], data);

      if (!url) {
        throw new Error('无法从响应中获取图片URL');
      }

      return url;
    } catch (error) {
      throw new Error(`上传失败: ${error.message}`);
    }
  }
});
