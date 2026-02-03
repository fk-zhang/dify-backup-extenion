// 内容脚本：在 Dify 页面中运行
// 监听来自 popup 的消息
// 注意：content script 运行在隔离的上下文中，需要通过注入的脚本来访问页面上下文

// 调试函数：检查备份脚本状态
// 注意：这个函数在 content script 上下文中运行
window.checkDifyBackupStatus = function() {
    console.log('=== Dify 备份脚本状态检查 ===');
    console.log('window.difyBackup 存在:', !!window.difyBackup);
    console.log('window.difyBackup 类型:', typeof window.difyBackup);
    if (window.difyBackup) {
        console.log('window.difyBackup 内容:', window.difyBackup);
        console.log('window.difyBackup 键:', Object.keys(window.difyBackup));
        console.log('window.difyBackup._loading:', window.difyBackup._loading);
        console.log('window.difyBackup._error:', window.difyBackup._error);
        console.log('window.difyBackup.backupAll 类型:', typeof window.difyBackup.backupAll);
        console.log('window.difyBackup.backupCurrent 类型:', typeof window.difyBackup.backupCurrent);
        console.log('window.difyBackup.loadJSZip 类型:', typeof window.difyBackup.loadJSZip);
    }
    console.log('window.difyBackupLoading:', window.difyBackupLoading);
    console.log('window.JSZip:', window.JSZip);
    console.log('chrome.runtime:', typeof chrome !== 'undefined' && chrome.runtime ? '存在' : '不存在');
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
            const url = chrome.runtime.getURL('backup-script.js');
            console.log('备份脚本 URL:', url);
        } catch (e) {
            console.error('获取脚本 URL 失败:', e);
        }
    }
    
    // 检查脚本是否已正确初始化
    const isInitialized = window.difyBackup && 
                         typeof window.difyBackup === 'object' &&
                         window.difyBackup.backupAll && 
                         typeof window.difyBackup.backupAll === 'function' &&
                         !window.difyBackup._loading;
    
    console.log('✅ 脚本是否已正确初始化:', isInitialized);
    
    return {
        difyBackup: !!window.difyBackup,
        difyBackupType: typeof window.difyBackup,
        isInitialized: isInitialized,
        isPlaceholder: window.difyBackup?._loading === true,
        hasError: !!window.difyBackup?._error,
        error: window.difyBackup?._error,
        difyBackupLoading: !!window.difyBackupLoading,
        jszip: !!window.JSZip,
        chromeRuntime: typeof chrome !== 'undefined' && !!chrome.runtime
    };
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startBackup') {
        handleBackupAll(request.config).then(result => {
            sendResponse(result);
        }).catch(error => {
            console.error('备份失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // 异步响应
    } else if (request.action === 'backupCurrent') {
        handleBackupCurrent().then(result => {
            sendResponse(result);
        }).catch(error => {
            console.error('备份当前应用失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.action === 'statisticsWorkflows') {
        handleStatisticsWorkflows(request.config).then(result => {
            sendResponse(result);
        }).catch(error => {
            console.error('统计失败:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
    return false;
});

// 确保页面上下文辅助脚本已加载
let pageContextHelperLoaded = false;

function loadPageContextHelper() {
    if (pageContextHelperLoaded) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('page-context-helper.js');
        script.onload = () => {
            pageContextHelperLoaded = true;
            console.log('✅ 页面上下文辅助脚本已加载');
            resolve();
        };
        script.onerror = () => {
            reject(new Error('无法加载页面上下文辅助脚本'));
        };
        (document.head || document.documentElement).appendChild(script);
    });
}

// 在页面上下文中执行备份操作
function executeInPageContext(action, config) {
    return new Promise((resolve, reject) => {
        const requestId = Date.now() + Math.random();
        
        const handler = (event) => {
            if (event.data && event.data.type === 'difyBackupExecuteResult' && 
                event.data.requestId === requestId) {
                window.removeEventListener('message', handler);
                if (event.data.success) {
                    resolve(event.data.result);
                } else {
                    reject(new Error(event.data.error));
                }
            }
        };
        
        window.addEventListener('message', handler);
        
        // 设置超时
        setTimeout(() => {
            window.removeEventListener('message', handler);
            reject(new Error('执行超时'));
        }, 300000); // 5 分钟超时
        
        // 发送执行命令
        window.postMessage({
            type: 'difyBackupExecute',
            action: action,
            config: config,
            requestId: requestId
        }, '*');
    });
}

// 备份所有应用
async function handleBackupAll(config) {
    // 先加载页面上下文辅助脚本和备份脚本
    await loadPageContextHelper();
    await loadBackupScript();
    
    // 在页面上下文中执行备份
    return await executeInPageContext('backupAll', config);
}

// 备份当前应用
async function handleBackupCurrent() {
    // 先加载页面上下文辅助脚本和备份脚本
    await loadPageContextHelper();
    await loadBackupScript();
    
    // 在页面上下文中执行备份
    return await executeInPageContext('backupCurrent', null);
}

// 统计工作流使用情况
async function handleStatisticsWorkflows(config) {
    // 先加载页面上下文辅助脚本和备份脚本
    await loadPageContextHelper();
    await loadBackupScript();
    
    // 在页面上下文中执行统计
    return await executeInPageContext('statisticsAllWorkflows', config);
}

// 在页面上下文中检查备份脚本状态（使用 postMessage）
function checkBackupScriptInPageContext() {
    return new Promise((resolveCheck) => {
        const requestId = Date.now() + Math.random();
        
        const handler = (event) => {
            if (event.data && event.data.type === 'difyBackupStatusCheckResult' && 
                event.data.requestId === requestId) {
                window.removeEventListener('message', handler);
                resolveCheck(event.data.result);
            }
        };
        
        window.addEventListener('message', handler);
        
        // 发送检查请求
        window.postMessage({
            type: 'difyBackupStatusCheck',
            requestId: requestId
        }, '*');
        
        setTimeout(() => {
            window.removeEventListener('message', handler);
            resolveCheck({ 
                isLoading: false, 
                exists: false, 
                isInitialized: false,
                error: '检查超时'
            });
        }, 1000);
    });
}

// 加载备份脚本
async function loadBackupScript() {
    // 先加载页面上下文辅助脚本（如果还没加载）
    await loadPageContextHelper();
    
    // 先检查是否已经加载（在页面上下文中检查）
    const status = await checkBackupScriptInPageContext();
    
    if (status.isInitialized) {
        console.log('✅ 备份脚本已存在且已初始化');
        return;
    }
    
    if (status.isLoading) {
        console.log('⏳ 备份脚本正在加载中，等待完成...');
        // 等待加载完成
        let checkCount = 0;
        const maxChecks = 50; // 最多等待 5 秒
        while (checkCount < maxChecks) {
            await new Promise(resolve => setTimeout(resolve, 100));
            const newStatus = await checkBackupScriptInPageContext();
            if (newStatus.isInitialized) {
                console.log('✅ 备份脚本加载完成');
                return;
            }
            if (!newStatus.isLoading && !newStatus.exists) {
                break; // 加载失败，继续执行加载逻辑
            }
            checkCount++;
        }
    }
    
    // 如果未加载，开始加载
    return new Promise(async (resolve, reject) => {
        
        console.log('📦 开始加载备份脚本...');
        window.difyBackupLoading = true;
        
        // 先在页面上下文中设置 JSZip URL（通过 postMessage）
        const jszipUrl = chrome.runtime.getURL('jszip.min.js');
        window.postMessage({
            type: 'difyBackupSetJSZipUrl',
            url: jszipUrl
        }, '*');
        
        // 等待一下确保消息被处理
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 创建脚本元素，确保在页面上下文中执行
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('backup-script.js');
        // 设置脚本类型
        script.type = 'text/javascript';
        // 确保脚本在页面上下文中执行（而不是隔离的 content script 上下文）
        script.setAttribute('data-extension', 'dify-backup');
        
        // 增加超时处理
        const timeout = setTimeout(() => {
            window.difyBackupLoading = false;
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            reject(new Error('备份脚本加载超时，请检查网络连接或刷新页面'));
        }, 10000); // 10 秒超时
        
        script.onload = () => {
            console.log('📄 备份脚本文件加载完成，等待初始化...');
            window.difyBackupLoading = false;
            clearTimeout(timeout);
            
            // 方法1: 监听自定义事件（如果脚本支持）
            const eventHandler = () => {
                console.log('✅ 收到备份脚本就绪事件');
                // 在页面上下文中验证
                checkBackupScriptInPageContext().then(result => {
                    if (result.exists && result.isObject && result.hasBackupAll) {
                        console.log('✅ 备份脚本初始化成功（通过事件验证）');
                        resolve();
                    } else {
                        console.warn('⚠️ 事件触发但对象未正确初始化，继续等待...', result);
                    }
                });
            };
            window.addEventListener('difyBackupReady', eventHandler, { once: true });
            
            // 方法2: 轮询检查（在页面上下文中）
            let retries = 0;
            const maxRetries = 50; // 最多等待 5 秒
            const checkInit = setInterval(async () => {
                retries++;
                
                // 在页面上下文中检查
                const result = await checkBackupScriptInPageContext();
                
                console.log(`[${retries}/${maxRetries}] 检查备份脚本状态:`, result);
                
                if (result.exists && result.isObject) {
                    // 检查是否是占位符（_loading 为 true 表示还在初始化）
                    if (result.isPlaceholder === true || result.isLoading === true) {
                        // 仍在加载中，继续等待
                        console.log('⏳ 备份脚本仍在初始化中...', {
                            isPlaceholder: result.isPlaceholder,
                            isLoading: result.isLoading
                        });
                        return;
                    }
                    // 检查是否有实际的方法（这是最重要的检查）
                    if (result.hasBackupAll && typeof result.hasBackupAll === 'boolean' && result.hasBackupAll) {
                        clearInterval(checkInit);
                        window.removeEventListener('difyBackupReady', eventHandler);
                        console.log('✅ 备份脚本初始化成功（通过轮询检查）');
                        console.log('window.difyBackup 方法:', result.keys);
                        resolve();
                        return;
                    } else {
                        console.warn('⚠️ window.difyBackup 存在但方法未就绪:', {
                            hasBackupAll: result.hasBackupAll,
                            hasBackupCurrent: result.hasBackupCurrent,
                            isPlaceholder: result.isPlaceholder,
                            isLoading: result.isLoading,
                            keys: result.keys
                        });
                    }
                } else {
                    if (retries < 10) {
                        // 前几次检查可能还没创建，继续等待
                        return;
                    }
                    console.warn('⚠️ window.difyBackup 未正确定义:', result);
                }
                
                // 超时处理
                if (retries >= maxRetries) {
                    clearInterval(checkInit);
                    window.removeEventListener('difyBackupReady', eventHandler);
                    console.error('❌ 备份脚本初始化失败：window.difyBackup 未正确定义');
                    console.error('页面上下文检查结果:', result);
                    reject(new Error('备份脚本初始化失败：脚本已加载但 window.difyBackup 未正确定义。请检查浏览器控制台的错误信息，或刷新页面后重试'));
                }
            }, 100);
        };
        
        script.onerror = (error) => {
            window.difyBackupLoading = false;
            clearTimeout(timeout);
            const scriptUrl = chrome.runtime.getURL('backup-script.js');
            console.error('❌ 备份脚本加载失败:', error);
            console.error('脚本 URL:', scriptUrl);
            console.error('请检查：');
            console.error('1. 扩展是否正确安装');
            console.error('2. manifest.json 中 backup-script.js 是否在 web_accessible_resources 中');
            console.error('3. 文件路径是否正确');
            reject(new Error(`无法加载备份脚本文件 (${scriptUrl})。请检查扩展是否正确安装，或刷新页面后重试`));
        };
        
        // 添加到页面
        (document.head || document.documentElement).appendChild(script);
    });
}
