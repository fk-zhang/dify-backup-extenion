// 页面上下文辅助脚本
// 这个脚本在页面上下文中运行，用于处理来自 content script 的消息

(function() {
    'use strict';
    
    // 防止重复注入
    if (window.__difyBackupHelperInjected) {
        return;
    }
    window.__difyBackupHelperInjected = true;
    
    // 监听来自 content script 的消息
    window.addEventListener('message', async function(event) {
        // 处理 JSZip URL 设置
        if (event.data && event.data.type === 'difyBackupSetJSZipUrl') {
            window.__difyBackupJSZipUrl = event.data.url;
            console.log('✅ JSZip URL 已设置:', window.__difyBackupJSZipUrl);
            return;
        }
        
        // 只处理来自扩展的消息
        if (event.data && event.data.type === 'difyBackupExecute') {
            const { action, config, requestId } = event.data;
            
            try {
                let result;
                if (action === 'backupAll') {
                    if (!window.difyBackup || !window.difyBackup.backupAll) {
                        throw new Error('备份脚本未正确初始化');
                    }
                    result = await window.difyBackup.backupAll(config || {});
                } else if (action === 'backupCurrent') {
                    if (!window.difyBackup || !window.difyBackup.backupCurrent) {
                        throw new Error('备份脚本未正确初始化');
                    }
                    result = await window.difyBackup.backupCurrent();
                } else if (action === 'statisticsAllWorkflows') {
                    if (!window.difyBackup || !window.difyBackup.statisticsAllWorkflows) {
                        throw new Error('备份脚本未正确初始化');
                    }
                    result = await window.difyBackup.statisticsAllWorkflows(config || {});
                } else {
                    throw new Error('未知的操作: ' + action);
                }
                
                window.postMessage({
                    type: 'difyBackupExecuteResult',
                    requestId: requestId,
                    success: true,
                    result: result
                }, '*');
            } catch (error) {
                window.postMessage({
                    type: 'difyBackupExecuteResult',
                    requestId: requestId,
                    success: false,
                    error: error.message,
                    stack: error.stack
                }, '*');
            }
        }
        
        // 处理状态检查请求
        if (event.data && event.data.type === 'difyBackupStatusCheck') {
            const { requestId } = event.data;
            const result = {
                isLoading: !!window.difyBackupLoading,
                exists: !!window.difyBackup,
                isObject: typeof window.difyBackup === 'object',
                isPlaceholder: window.difyBackup?._loading === true,
                hasBackupAll: typeof window.difyBackup?.backupAll === 'function',
                hasBackupCurrent: typeof window.difyBackup?.backupCurrent === 'function',
                hasStatisticsAllWorkflows: typeof window.difyBackup?.statisticsAllWorkflows === 'function',
                isInitialized: !!(window.difyBackup && typeof window.difyBackup === 'object' && 
                               window.difyBackup.backupAll && typeof window.difyBackup.backupAll === 'function' &&
                               !window.difyBackup._loading),
                keys: window.difyBackup ? Object.keys(window.difyBackup) : []
            };
            window.postMessage({ 
                type: 'difyBackupStatusCheckResult', 
                requestId: requestId,
                result: result 
            }, '*');
        }
    });
})();

