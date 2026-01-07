// 后台服务脚本
// 处理扩展的后台任务

// 安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Dify 备份工具已安装');
        // 可以在这里设置默认配置
        chrome.storage.local.set({
            includeSecrets: false,
            includeWorkflowDraft: false
        });
    }
});

// 监听来自 content script 的消息（进度更新）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'backupProgress') {
        // 广播进度消息（所有监听者都能收到）
        chrome.runtime.sendMessage(message).catch(() => {
            // popup 可能未打开，忽略错误
        });
    }
    return true;
});

