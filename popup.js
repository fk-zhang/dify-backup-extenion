// 获取当前标签页
async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// 更新状态显示
function updateStatus(text, page = '') {
    document.getElementById('statusText').textContent = text;
    if (page) {
        document.getElementById('currentPage').textContent = page;
    }
}

// 显示进度
function showProgress(percent, text) {
    const progressSection = document.getElementById('progressSection');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressSection.style.display = 'block';
    progressFill.style.width = percent + '%';
    progressText.textContent = text;
}

// 隐藏进度
function hideProgress() {
    document.getElementById('progressSection').style.display = 'none';
}

// 显示警告
function showWarning(info) {
    const warningSection = document.getElementById('warningSection');
    const warningInfo = document.getElementById('warningInfo');
    
    warningSection.style.display = 'block';
    warningInfo.innerHTML = info;
    
    // 隐藏结果区域
    hideResult();
}

// 隐藏警告
function hideWarning() {
    document.getElementById('warningSection').style.display = 'none';
}

// 显示结果
function showResult(info) {
    const resultSection = document.getElementById('resultSection');
    const resultInfo = document.getElementById('resultInfo');
    
    resultSection.style.display = 'block';
    resultInfo.innerHTML = info;
    
    // 隐藏警告区域
    hideWarning();
}

// 初始化
async function init() {
    const tab = await getCurrentTab();
    const url = new URL(tab.url);
    
    // 显示更友好的页面信息
    let pageInfo = url.hostname;
    if (url.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        // 如果是 IP 地址，显示 IP 和端口（如果有）
        pageInfo = url.hostname + (url.port ? ':' + url.port : '');
    } else {
        // 如果是域名，显示域名
        pageInfo = url.hostname;
    }
    
    updateStatus('就绪', pageInfo);
    
    // 加载保存的配置
    const config = await chrome.storage.local.get(['includeSecrets', 'includeWorkflowDraft']);
    if (config.includeSecrets !== undefined) {
        document.getElementById('includeSecrets').checked = config.includeSecrets;
    }
    if (config.includeWorkflowDraft !== undefined) {
        document.getElementById('includeWorkflowDraft').checked = config.includeWorkflowDraft;
    }
    
    // 绑定事件
    document.getElementById('backupBtn').addEventListener('click', handleBackup);
    document.getElementById('backupCurrentBtn').addEventListener('click', handleBackupCurrent);
    document.getElementById('includeSecrets').addEventListener('change', saveConfig);
    document.getElementById('includeWorkflowDraft').addEventListener('change', saveConfig);
    document.getElementById('helpLink').addEventListener('click', showHelp);
}

// 保存配置
async function saveConfig() {
    const config = {
        includeSecrets: document.getElementById('includeSecrets').checked,
        includeWorkflowDraft: document.getElementById('includeWorkflowDraft').checked
    };
    await chrome.storage.local.set(config);
}

// 处理备份所有应用
async function handleBackup() {
    const tab = await getCurrentTab();
    const config = {
        includeSecrets: document.getElementById('includeSecrets').checked,
        includeWorkflowDraft: document.getElementById('includeWorkflowDraft').checked
    };
    
    // 禁用按钮
    const btn = document.getElementById('backupBtn');
    btn.disabled = true;
    btn.textContent = '备份中...';
    
    updateStatus('备份中...');
    showProgress(0, '准备中...');
    hideResult();
    
    try {
        // 通过 content script 发送消息开始备份
        // content script 会自动加载备份脚本
        chrome.tabs.sendMessage(tab.id, {
            action: 'startBackup',
            config: config
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('发送消息失败:', chrome.runtime.lastError);
                updateStatus('备份失败');
                
                // 检查是否是页面不匹配的错误
                let errorMsg = chrome.runtime.lastError.message;
                if (errorMsg.includes('Could not establish connection') || 
                    errorMsg.includes('Receiving end does not exist')) {
                    errorMsg = '无法连接到页面脚本。请确保：<br>' +
                              '1. 已刷新页面<br>' +
                              '2. 扩展已正确安装';
                }
                
                showResult(`<strong>错误：</strong>${errorMsg}`);
                btn.disabled = false;
                btn.textContent = '📦 开始备份';
                return;
            }
            
            if (response && response.success) {
                updateStatus('备份完成');
                showProgress(100, '完成！');
                showResult(`
                    <strong>备份成功！</strong><br>
                    总计: ${response.totalApps} 个应用<br>
                    成功: ${response.successCount} 个<br>
                    失败: ${response.failedCount} 个<br>
                    文件: ${response.zipFileName}
                `);
            } else {
                updateStatus('备份失败');
                showResult(`<strong>错误：</strong>${response?.error || '备份失败'}`);
            }
            
            btn.disabled = false;
            btn.textContent = '📦 开始备份';
        });
        
    } catch (error) {
        console.error('备份失败:', error);
        updateStatus('备份失败');
        showResult(`<strong>错误：</strong>${error.message}`);
        btn.disabled = false;
        btn.textContent = '📦 开始备份';
    }
}

// 处理备份当前应用
async function handleBackupCurrent() {
    const tab = await getCurrentTab();
    
    const btn = document.getElementById('backupCurrentBtn');
    btn.disabled = true;
    btn.textContent = '备份中...';
    
    updateStatus('备份当前应用...');
    
    try {
        chrome.tabs.sendMessage(tab.id, {
            action: 'backupCurrent'
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('发送消息失败:', chrome.runtime.lastError);
                updateStatus('备份失败');
                showResult(`<strong>错误：</strong>${chrome.runtime.lastError.message}<br>请确保在应用详情页面使用此功能`);
                btn.disabled = false;
                btn.textContent = '📄 备份当前应用';
                return;
            }
            
            if (response && response.success) {
                updateStatus('备份完成');
                showResult(`<strong>备份成功！</strong><br>文件: ${response.fileName}`);
            } else {
                updateStatus('备份失败');
                showResult(`<strong>错误：</strong>${response?.error || '备份失败'}`);
            }
            btn.disabled = false;
            btn.textContent = '📄 备份当前应用';
        });
    } catch (error) {
        console.error('备份失败:', error);
        updateStatus('备份失败');
        showResult(`<strong>错误：</strong>${error.message}`);
        btn.disabled = false;
        btn.textContent = '📄 备份当前应用';
    }
}

// 隐藏结果
function hideResult() {
    document.getElementById('resultSection').style.display = 'none';
}

// 显示帮助
function showHelp(e) {
    e.preventDefault();
    chrome.tabs.create({
        url: chrome.runtime.getURL('help.html')
    });
}

// 监听进度更新
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'backupProgress') {
        showProgress(message.percent, message.text);
    }
    return true;
});

// 初始化
init();

