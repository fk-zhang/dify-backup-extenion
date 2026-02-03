// Dify 备份脚本 - 用于 Chrome 扩展
// 将备份功能封装为 window.difyBackup 对象

(function() {
    'use strict';
    
    // 立即创建占位符对象，确保 window.difyBackup 始终存在
    window.difyBackup = window.difyBackup || {
        _loading: true,
        _error: null
    };
    
    console.log('🚀 开始初始化 Dify 备份脚本...');
    
    // 从扩展本地资源加载 JSZip（不需要用户手动指定）
    async function loadJSZip() {
        // 如果已经加载，直接返回
        if (window.JSZip) {
            console.log('✅ JSZip 已加载');
            return window.JSZip;
        }
        
        // 从全局变量获取 JSZip URL（由 content script 设置）
        let jszipUrl = window.__difyBackupJSZipUrl;
        
        // 如果 URL 未设置，尝试从 chrome.runtime 获取（如果可用）
        if (!jszipUrl && typeof chrome !== 'undefined' && chrome.runtime) {
            jszipUrl = chrome.runtime.getURL('jszip.min.js');
        }
        
        if (!jszipUrl) {
            throw new Error('无法获取 JSZip URL，请确保扩展已正确加载');
        }
        
        console.log('📦 正在从扩展资源加载 JSZip:', jszipUrl);
        
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = jszipUrl;
            script.onload = () => {
                if (window.JSZip) {
                    console.log('✅ JSZip 从扩展资源加载成功');
                    resolve();
                } else {
                    reject(new Error('JSZip 未定义，请检查 jszip.min.js 文件是否存在'));
                }
            };
            script.onerror = (error) => {
                console.error('❌ 加载 JSZip 失败:', error);
                reject(new Error('无法加载本地 JSZip 库，请确保 jszip.min.js 文件存在于扩展目录中'));
            };
            document.head.appendChild(script);
        });
        
        return window.JSZip;
    }
    
    // JSON 转 YAML（简化版，处理基本结构）
    function jsonToYaml(obj, indent = 0) {
        const indentStr = '  '.repeat(indent);
        let yaml = '';
        
        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    yaml += `${indentStr}- `;
                    const itemYaml = jsonToYaml(item, indent + 1);
                    yaml += itemYaml.replace(/^  /, '') + '\n';
                } else {
                    yaml += `${indentStr}- ${item}\n`;
                }
            });
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        yaml += `${indentStr}${key}:\n`;
                        yaml += jsonToYaml(value, indent + 1);
                    } else if (Array.isArray(value)) {
                        yaml += `${indentStr}${key}:\n`;
                        yaml += jsonToYaml(value, indent + 1);
                    } else {
                        const strValue = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
                        yaml += `${indentStr}${key}: ${strValue}\n`;
                    }
                }
            }
        } else {
            yaml = `${obj}\n`;
        }
        
        return yaml;
    }
    
    // 清理文件名（移除特殊字符）
    function sanitizeFileName(name) {
        return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    }
    
    // 配置
    const defaultConfig = {
        // Dify 平台基础 URL（根据实际情况修改）
        baseUrl: window.location.origin,
        // 是否包含敏感信息（对应 include_secret 参数）
        includeSecrets: false,
        // 是否包含工作流草稿
        includeWorkflowDraft: false,
        // 备份文件前缀
        filePrefix: 'dify_backup',
        // 分页大小
        pageLimit: 30
    };
    
    // 获取 CSRF Token（从 Cookie 或 meta 标签）
    function getCSRFToken() {
        // 方法1: 从 Cookie 中获取
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            // 常见的 CSRF token Cookie 名称
            if (name === 'csrf_token' || name === 'csrf-token' || name === '__Host-csrf_token' || 
                name === 'X-CSRF-Token' || name === '_csrf' ||
                name === 'csrfToken' || name === 'CSRF-TOKEN') {
                return decodeURIComponent(value);
            }
        }
        
        // 方法2: 从 meta 标签中获取
        const metaTags = document.querySelectorAll('meta[name*="csrf"], meta[name*="CSRF"]');
        for (let meta of metaTags) {
            if (meta.content) return meta.content;
        }
        
        // 方法3: 从页面脚本或全局变量中获取
        if (window.csrfToken) return window.csrfToken;
        if (window.CSRFToken) return window.CSRFToken;
        if (window._csrf) return window._csrf;
        
        // 方法4: 从表单中获取（如果有表单）
        const csrfInput = document.querySelector('input[name*="csrf"], input[name*="CSRF"]');
        if (csrfInput && csrfInput.value) return csrfInput.value;
        
        // 方法5: 尝试从 localStorage/sessionStorage 获取
        const storedToken = localStorage.getItem('csrf_token') || 
                           localStorage.getItem('csrfToken') ||
                           sessionStorage.getItem('csrf_token');
        if (storedToken) return storedToken;
        
        return null;
    }
    
    // 获取认证 Token（从 Cookie 或 LocalStorage）
    function getAuthToken() {
        // 方法1: 从 Cookie 中获取
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'access_token' || name === 'token' || name === 'auth_token') {
                return value;
            }
        }
        
        // 方法2: 从 LocalStorage 中获取
        const token = localStorage.getItem('access_token') || 
                     localStorage.getItem('token') || 
                     localStorage.getItem('auth_token');
        if (token) return token;
        
        // 方法3: 从 SessionStorage 中获取
        const sessionToken = sessionStorage.getItem('access_token') || 
                            sessionStorage.getItem('token');
        if (sessionToken) return sessionToken;
        
        return null;
    }
    
    // 调用 Dify API
    async function callDifyAPI(endpoint, options = {}) {
        const token = getAuthToken();
        const csrfToken = getCSRFToken();
        
        // 确保 endpoint 以 / 开头
        const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${defaultConfig.baseUrl}${normalizedEndpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // 添加认证头
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // 添加 CSRF Token（重要！）
        if (csrfToken) {
            // 常见的 CSRF token 请求头名称
            headers['X-CSRF-Token'] = csrfToken;
            headers['X-CSRFToken'] = csrfToken;
            headers['CSRF-Token'] = csrfToken;
        }
        
        // 如果浏览器有 Cookie，会自动携带
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include' // 包含 Cookie（重要！）
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 调用失败: ${response.status} ${response.statusText}\n${errorText}`);
        }
        
        return await response.json();
    }
    
    // 获取所有工作空间
    async function getWorkspaces() {
        try {
            const data = await callDifyAPI('/console/api/workspaces');
            
            // 处理不同的响应格式
            if (Array.isArray(data)) {
                return data;
            } else if (data.data && Array.isArray(data.data)) {
                return data.data;
            } else if (data.workspaces && Array.isArray(data.workspaces)) {
                return data.workspaces;
            } else if (data.items && Array.isArray(data.items)) {
                return data.items;
            } else if (data && typeof data === 'object') {
                // 如果是对象但不是数组，尝试查找数组字段
                for (let key in data) {
                    if (Array.isArray(data[key])) {
                        console.log(`找到工作空间数组，字段名: ${key}`);
                        return data[key];
                    }
                }
                // 如果没有找到数组，返回空数组
                console.warn('工作空间响应格式未知:', data);
                return [];
            }
            
            return [];
        } catch (error) {
            console.error('获取工作空间列表失败:', error);
            throw error;
        }
    }
    
    // 获取当前工作空间信息
    async function getCurrentWorkspace() {
        try {
            const data = await callDifyAPI('/console/api/workspaces/current');
            
            // 处理不同的响应格式
            if (data && typeof data === 'object') {
                // 直接返回数据对象，可能包含 name 字段
                return data;
            } else if (data.data && typeof data.data === 'object') {
                return data.data;
            } else if (data.workspace && typeof data.workspace === 'object') {
                return data.workspace;
            }
            
            return null;
        } catch (error) {
            console.error('获取当前工作空间信息失败:', error);
            throw error;
        }
    }
    
    // 获取应用列表（支持分页）
    async function getApplications(page = 1, limit = 30, allApps = []) {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                name: '',
                is_created_by_me: 'false'
            });
            
            const data = await callDifyAPI(`/console/api/apps?${params}`);
            
            // 处理响应数据
            let apps = [];
            if (data.data && Array.isArray(data.data)) {
                apps = data.data;
            } else if (Array.isArray(data)) {
                apps = data;
            } else if (data.items && Array.isArray(data.items)) {
                apps = data.items;
            }
            
            allApps = allApps.concat(apps);
            
            // 检查是否还有更多页面
            const total = data.total || data.count || 0;
            const hasMore = (page * limit) < total;
            
            if (hasMore && apps.length === limit) {
                // 递归获取下一页
                console.log(`📄 已获取 ${allApps.length} 个应用，继续获取下一页...`);
                return await getApplications(page + 1, limit, allApps);
            }
            
            return allApps;
        } catch (error) {
            console.error('获取应用列表失败:', error);
            throw error;
        }
    }
    
    // 导出应用 DSL
    async function exportAppDSL(dslId) {
        try {
            const params = defaultConfig.includeSecrets ? 'include_secret=true' : 'include_secret=false';
            const data = await callDifyAPI(`/console/api/apps/${dslId}/export?${params}`);
            return data.data || data;
        } catch (error) {
            console.error(`导出应用 ${dslId} DSL 失败:`, error);
            throw error;
        }
    }
    
    // 获取工作流草稿（可选）
    async function getWorkflowDraft(dslId) {
        try {
            const data = await callDifyAPI(`/console/api/apps/${dslId}/workflows/draft`);
            return data.data || data;
        } catch (error) {
            console.warn(`获取工作流草稿失败 (${dslId}):`, error.message);
            return null;
        }
    }
    
    // 格式化时间为 ISO 8601 格式（用于 workflow-app-logs）
    function formatDateTimeForWorkflowAPI(dateTimeStr) {
        if (!dateTimeStr) return null;
        // 输入格式：YYYY-MM-DD HH:MM
        // 输出格式：YYYY-MM-DDTHH:MM:00+08:00 (ISO 8601 with timezone)
        try {
            const [datePart, timePart] = dateTimeStr.split(' ');
            if (!datePart || !timePart) return null;
            
            // 获取当前时区偏移（小时）
            const timezoneOffset = -new Date().getTimezoneOffset() / 60;
            const timezoneSign = timezoneOffset >= 0 ? '+' : '-';
            const timezoneHours = String(Math.abs(timezoneOffset)).padStart(2, '0');
            const timezoneStr = `${timezoneSign}${timezoneHours}:00`;
            
            return `${datePart}T${timePart}:00${timezoneStr}`;
        } catch (error) {
            console.warn('时间格式转换失败:', error);
            return null;
        }
    }
    
    // 获取应用的对话列表（支持分页和时间筛选）- 用于 chatflow/agent
    async function getChatConversations(dslId, page = 1, limit = 100, startDate = null, endDate = null) {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                sort_by: '-created_at',
                annotation_status: 'all'
            });
            
            // 添加时间筛选参数
            // 格式：YYYY-MM-DD HH:MM，URLSearchParams 会自动编码为 YYYY-MM-DD+HH%3AMM
            if (startDate) {
                params.append('start', startDate);
            }
            if (endDate) {
                params.append('end', endDate);
            }
            
            const data = await callDifyAPI(`/console/api/apps/${dslId}/chat-conversations?${params}`);
            return data;
        } catch (error) {
            console.error(`获取对话列表失败 (${dslId}):`, error);
            throw error;
        }
    }
    
    // 获取工作流应用日志（支持分页和时间筛选）- 用于 workflow
    async function getWorkflowAppLogs(dslId, page = 1, limit = 100, startDate = null, endDate = null) {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });
            
            // 添加时间筛选参数（ISO 8601 格式）
            if (startDate) {
                const formattedStart = formatDateTimeForWorkflowAPI(startDate);
                if (formattedStart) {
                    params.append('created_at__after', formattedStart);
                }
            }
            if (endDate) {
                const formattedEnd = formatDateTimeForWorkflowAPI(endDate);
                if (formattedEnd) {
                    params.append('created_at__before', formattedEnd);
                }
            }
            
            const data = await callDifyAPI(`/console/api/apps/${dslId}/workflow-app-logs?${params}`);
            return data;
        } catch (error) {
            console.error(`获取工作流日志失败 (${dslId}):`, error);
            throw error;
        }
    }
    
    // 获取文本生成对话列表（支持分页和时间筛选）- 用于 completion
    async function getCompletionConversations(dslId, page = 1, limit = 100, startDate = null, endDate = null) {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                sort_by: '-created_at',
                annotation_status: 'all'
            });
            
            // 添加时间筛选参数
            // 格式：YYYY-MM-DD HH:MM，URLSearchParams 会自动编码为 YYYY-MM-DD+HH%3AMM
            if (startDate) {
                params.append('start', startDate);
            }
            if (endDate) {
                params.append('end', endDate);
            }
            
            const data = await callDifyAPI(`/console/api/apps/${dslId}/completion-conversations?${params}`);
            return data;
        } catch (error) {
            console.error(`获取文本生成对话列表失败 (${dslId}):`, error);
            throw error;
        }
    }
    
    // 获取所有对话记录（用于统计用户覆盖数）- 用于 chatflow/agent
    async function getAllChatConversations(dslId, limit = 100, startDate = null, endDate = null) {
        let allConversations = [];
        let page = 1;
        let hasMore = true;
        let total = 0;
        
        while (hasMore) {
            try {
                const data = await getChatConversations(dslId, page, limit, startDate, endDate);
                
                // 获取总对话数（只在第一页获取）
                if (page === 1) {
                    total = data.total || 0;
                }
                
                // 获取对话列表
                const conversations = data.data || [];
                allConversations = allConversations.concat(conversations);
                
                // 检查是否还有更多
                hasMore = data.has_more || false;
                
                // 如果已经获取了所有对话，停止
                if (allConversations.length >= total) {
                    hasMore = false;
                }
                
                page++;
                
                // 避免请求过快
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.warn(`获取第 ${page} 页对话失败 (${dslId}):`, error.message);
                // 如果第一页就失败，返回已获取的数据
                break;
            }
        }
        
        return {
            total: total,
            conversations: allConversations
        };
    }
    
    // 获取所有工作流日志（用于统计用户覆盖数）- 用于 workflow
    async function getAllWorkflowAppLogs(dslId, limit = 100, startDate = null, endDate = null) {
        let allLogs = [];
        let page = 1;
        let hasMore = true;
        let total = 0;
        
        while (hasMore) {
            try {
                const data = await getWorkflowAppLogs(dslId, page, limit, startDate, endDate);
                
                // 获取总日志数（只在第一页获取）
                if (page === 1) {
                    total = data.total || data.count || 0;
                }
                
                // 获取日志列表
                const logs = data.data || data.items || [];
                allLogs = allLogs.concat(logs);
                
                // 检查是否还有更多
                hasMore = data.has_more !== false && logs.length === limit;
                
                // 如果已经获取了所有日志，停止
                if (total > 0 && allLogs.length >= total) {
                    hasMore = false;
                }
                
                // 如果没有更多数据，停止
                if (logs.length === 0) {
                    hasMore = false;
                }
                
                page++;
                
                // 避免请求过快
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.warn(`获取第 ${page} 页工作流日志失败 (${dslId}):`, error.message);
                // 如果第一页就失败，返回已获取的数据
                break;
            }
        }
        
        return {
            total: total,
            logs: allLogs
        };
    }
    
    // 获取所有文本生成对话记录（用于统计用户覆盖数）- 用于 completion
    async function getAllCompletionConversations(dslId, limit = 100, startDate = null, endDate = null) {
        let allConversations = [];
        let page = 1;
        let hasMore = true;
        let total = 0;
        
        while (hasMore) {
            try {
                const data = await getCompletionConversations(dslId, page, limit, startDate, endDate);
                
                // 获取总对话数（只在第一页获取）
                if (page === 1) {
                    total = data.total || 0;
                }
                
                // 获取对话列表
                const conversations = data.data || [];
                allConversations = allConversations.concat(conversations);
                
                // 检查是否还有更多
                hasMore = data.has_more || false;
                
                // 如果已经获取了所有对话，停止
                if (allConversations.length >= total) {
                    hasMore = false;
                }
                
                page++;
                
                // 避免请求过快
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.warn(`获取第 ${page} 页文本生成对话失败 (${dslId}):`, error.message);
                // 如果第一页就失败，返回已获取的数据
                break;
            }
        }
        
        return {
            total: total,
            conversations: allConversations
        };
    }
    
    // 检测应用类型（chatflow/agent、workflow 或 completion）
    async function detectAppType(dslId) {
        let chatflowError = null;
        let workflowError = null;
        let completionError = null;
        
        // 先尝试获取 chat-conversations（chatflow/agent 类型）
        try {
            const chatData = await getChatConversations(dslId, 1, 1);
            if (chatData && (chatData.total !== undefined || chatData.data !== undefined)) {
                console.log(`✅ 检测到应用类型: chatflow (通过 chat-conversations)`);
                return 'chatflow';
            }
        } catch (error) {
            chatflowError = error;
            console.log(`⚠️ chat-conversations 接口失败: ${error.message}`);
        }
        
        // 尝试获取 completion-conversations（completion 类型）
        try {
            const completionData = await getCompletionConversations(dslId, 1, 1);
            if (completionData && (completionData.total !== undefined || completionData.data !== undefined)) {
                console.log(`✅ 检测到应用类型: completion (通过 completion-conversations)`);
                return 'completion';
            }
        } catch (error) {
            completionError = error;
            console.log(`⚠️ completion-conversations 接口失败: ${error.message}`);
        }
        
        // 尝试获取 workflow-app-logs（workflow 类型）
        try {
            const workflowData = await getWorkflowAppLogs(dslId, 1, 1);
            if (workflowData && (workflowData.total !== undefined || workflowData.data !== undefined || workflowData.items !== undefined)) {
                console.log(`✅ 检测到应用类型: workflow (通过 workflow-app-logs)`);
                return 'workflow';
            }
        } catch (error) {
            workflowError = error;
            console.log(`⚠️ workflow-app-logs 接口失败: ${error.message}`);
        }
        
        // 如果所有接口都失败，根据错误信息判断
        // 如果 chat-conversations 返回 404，可能是其他类型
        if (chatflowError && chatflowError.message && chatflowError.message.includes('404')) {
            // 如果 completion-conversations 也返回 404，可能是 workflow
            if (completionError && completionError.message && completionError.message.includes('404')) {
                console.log(`⚠️ chat-conversations 和 completion-conversations 都返回 404，尝试使用 workflow 类型`);
                return 'workflow';
            }
            // 如果 completion-conversations 成功，返回 completion
            if (!completionError) {
                return 'completion';
            }
        }
        
        // 如果 completion-conversations 返回 404，可能是 chatflow 或 workflow
        if (completionError && completionError.message && completionError.message.includes('404')) {
            // 如果 workflow-app-logs 也返回 404，可能是 chatflow
            if (workflowError && workflowError.message && workflowError.message.includes('404')) {
                console.log(`⚠️ completion-conversations 和 workflow-app-logs 都返回 404，使用 chatflow 类型`);
                return 'chatflow';
            }
        }
        
        // 默认返回 chatflow（向后兼容）
        console.log(`⚠️ 无法确定应用类型，默认使用 chatflow`);
        return 'chatflow';
    }
    
    // 统计工作流使用情况（自动检测应用类型）
    async function getWorkflowStatistics(dslId, appName = '', startDate = null, endDate = null, appMode = null) {
        try {
            const timeRange = startDate && endDate ? ` (${startDate} 至 ${endDate})` : '';
            console.log(`📊 正在统计工作流 ${appName || dslId} (${dslId}) 的使用情况${timeRange}...`);
            
            // 检测应用类型
            let appType = appMode;
            if (!appType) {
                appType = await detectAppType(dslId);
            }
            
            console.log(`📊 检测到应用类型: ${appType}`);
            
            if (appType === 'workflow') {
                // 使用 workflow-app-logs 接口
                return await getWorkflowStatisticsFromLogs(dslId, appName, startDate, endDate);
            } else if (appType === 'completion') {
                // 使用 completion-conversations 接口
                return await getWorkflowStatisticsFromCompletion(dslId, appName, startDate, endDate);
            } else {
                // 使用 chat-conversations 接口（默认，兼容 chatflow/agent）
                return await getWorkflowStatisticsFromConversations(dslId, appName, startDate, endDate);
            }
        } catch (error) {
            console.error(`统计工作流 ${appName || dslId} (${dslId}) 失败:`, error);
            return {
                dslId: dslId,
                totalUsage: 0,
                userCoverage: 0,
                error: error.message
            };
        }
    }
    
    // 从对话记录统计（chatflow/agent）
    async function getWorkflowStatisticsFromConversations(dslId, appName = '', startDate = null, endDate = null) {
        try {
            // 获取第一页数据以获取 total
            const firstPage = await getChatConversations(dslId, 1, 1, startDate, endDate);
            const total = firstPage.total || 0;
            
            // 如果 total 为 0，直接返回
            if (total === 0) {
                console.log(`✅ 工作流 ${appName || dslId} 统计完成: 总使用数=0, 用户覆盖数=0`);
                return {
                    dslId: dslId,
                    totalUsage: 0,
                    userCoverage: 0
                };
            }
            
            console.log(`📊 工作流 ${appName || dslId} 共有 ${total} 条对话记录，正在获取所有记录以统计用户覆盖数...`);
            
            // 获取所有对话记录以统计用户覆盖数
            const { conversations } = await getAllChatConversations(dslId, 100, startDate, endDate);
            
            // 统计用户覆盖数
            // 优先使用 from_account_name 去重，如果 from_account_name 为 null 则使用 from_end_user_session_id
            // 每个工作流只能使用一个字段属性去重
            const userSet = new Set();
            
            // 先检查是否有 from_account_name 不为 null 的记录
            const hasAccountName = conversations.some(conv => conv.from_account_name !== null && conv.from_account_name !== undefined);
            
            if (hasAccountName) {
                // 如果有 from_account_name 不为 null 的记录，统一使用 from_account_name 去重
                conversations.forEach(conv => {
                    if (conv.from_account_name) {
                        userSet.add(conv.from_account_name);
                    }
                });
            } else {
                // 如果所有记录的 from_account_name 都为 null，使用 from_end_user_session_id 去重
                conversations.forEach(conv => {
                    if (conv.from_end_user_session_id) {
                        userSet.add(conv.from_end_user_session_id);
                    }
                });
            }
            
            const userCoverage = userSet.size;
            
            console.log(`✅ 工作流 ${appName || dslId} 统计完成: 总使用数=${total}, 用户覆盖数=${userCoverage}`);
            
            return {
                dslId: dslId,
                totalUsage: total,
                userCoverage: userCoverage
            };
        } catch (error) {
            throw error;
        }
    }
    
    // 从工作流日志统计（workflow）
    async function getWorkflowStatisticsFromLogs(dslId, appName = '', startDate = null, endDate = null) {
        try {
            // 获取第一页数据以获取 total
            const firstPage = await getWorkflowAppLogs(dslId, 1, 1, startDate, endDate);
            const total = firstPage.total || firstPage.count || 0;
            
            // 如果 total 为 0，直接返回
            if (total === 0) {
                console.log(`✅ 工作流 ${appName || dslId} 统计完成: 总使用数=0, 用户覆盖数=0`);
                return {
                    dslId: dslId,
                    totalUsage: 0,
                    userCoverage: 0
                };
            }
            
            console.log(`📊 工作流 ${appName || dslId} 共有 ${total} 条日志记录，正在获取所有记录以统计用户覆盖数...`);
            
            // 获取所有日志记录以统计用户覆盖数
            const { logs } = await getAllWorkflowAppLogs(dslId, 100, startDate, endDate);
            
            // 统计用户覆盖数
            // 优先使用 created_by_account.name 去重，如果为 null，使用 created_by_end_user.session_id 去重
            // 每个工作流只使用一个字段去重
            const userSet = new Set();
            
            // 先检查是否有 created_by_account.name 不为 null 的记录
            const hasAccountName = logs.some(log => 
                log.created_by_account && 
                log.created_by_account.name !== null && 
                log.created_by_account.name !== undefined
            );
            
            if (hasAccountName) {
                // 如果有 created_by_account.name 不为 null 的记录，统一使用 created_by_account.name 去重
                logs.forEach(log => {
                    if (log.created_by_account && log.created_by_account.name) {
                        userSet.add(log.created_by_account.name);
                    }
                });
            } else {
                // 如果所有记录的 created_by_account.name 都为 null，使用 created_by_end_user.session_id 去重
                logs.forEach(log => {
                    if (log.created_by_end_user && log.created_by_end_user.session_id) {
                        userSet.add(log.created_by_end_user.session_id);
                    }
                });
            }
            
            const userCoverage = userSet.size;
            
            console.log(`✅ 工作流 ${appName || dslId} 统计完成: 总使用数=${total}, 用户覆盖数=${userCoverage}`);
            
            return {
                dslId: dslId,
                totalUsage: total,
                userCoverage: userCoverage
            };
        } catch (error) {
            throw error;
        }
    }
    
    // 从文本生成对话统计（completion）
    async function getWorkflowStatisticsFromCompletion(dslId, appName = '', startDate = null, endDate = null) {
        try {
            // 获取第一页数据以获取 total
            const firstPage = await getCompletionConversations(dslId, 1, 1, startDate, endDate);
            const total = firstPage.total || 0;
            
            // 如果 total 为 0，直接返回
            if (total === 0) {
                console.log(`✅ 工作流 ${appName || dslId} 统计完成: 总使用数=0, 用户覆盖数=0`);
                return {
                    dslId: dslId,
                    totalUsage: 0,
                    userCoverage: 0
                };
            }
            
            console.log(`📊 工作流 ${appName || dslId} 共有 ${total} 条对话记录，正在获取所有记录以统计用户覆盖数...`);
            
            // 获取所有对话记录以统计用户覆盖数
            const { conversations } = await getAllCompletionConversations(dslId, 100, startDate, endDate);
            
            // 统计用户覆盖数（使用 from_account_name 去重）
            const userSet = new Set();
            conversations.forEach(conv => {
                // completion-conversations 使用 from_account_name 字段
                if (conv.from_account_name) {
                    userSet.add(conv.from_account_name);
                }
            });
            
            const userCoverage = userSet.size;
            
            console.log(`✅ 工作流 ${appName || dslId} 统计完成: 总使用数=${total}, 用户覆盖数=${userCoverage}`);
            
            return {
                dslId: dslId,
                totalUsage: total,
                userCoverage: userCoverage
            };
        } catch (error) {
            throw error;
        }
    }
    
    // 统计所有工作空间的工作流使用情况
    async function statisticsAllWorkflows(config = {}) {
        const finalConfig = { ...defaultConfig, ...config };
        
        // 获取时间范围参数
        const startDate = config.startDate || null;
        const endDate = config.endDate || null;
        
        try {
            const timeRange = startDate && endDate ? ` (${startDate} 至 ${endDate})` : '';
            console.log(`📊 开始统计工作流使用情况${timeRange}...`);
            
            sendProgress(5, '获取工作空间信息...');
            
            // 1. 获取当前工作空间信息
            let currentWorkspace = null;
            let workspaceName = 'workspace';
            try {
                currentWorkspace = await getCurrentWorkspace();
                if (currentWorkspace && currentWorkspace.name) {
                    workspaceName = currentWorkspace.name;
                    console.log(`✅ 当前工作空间: ${workspaceName}`);
                }
            } catch (e) {
                console.warn('⚠️ 无法获取当前工作空间信息:', e.message);
            }
            
            sendProgress(10, '获取应用列表...');
            
            // 2. 获取应用列表
            const apps = await getApplications(1, finalConfig.pageLimit);
            console.log(`✅ 找到 ${apps.length} 个应用`);
            
            if (apps.length === 0) {
                throw new Error('当前工作空间没有应用，无法统计');
            }
            
            sendProgress(15, `开始统计 ${apps.length} 个工作流...`);
            
            // 3. 统计每个工作流
            const statistics = [];
            let successCount = 0;
            let failedCount = 0;
            
            for (let i = 0; i < apps.length; i++) {
                const app = apps[i];
                const dslId = app.dsl_id || app.id || app.app_id;
                const appName = app.name || app.app_name || dslId;
                const appMode = app.mode || app.app_mode || null; // 尝试从应用数据中获取类型
                
                const progress = 15 + Math.floor((i / apps.length) * 80);
                sendProgress(progress, `统计中: ${appName} (${i + 1}/${apps.length})`);
                
                console.log(`📊 [${i + 1}/${apps.length}] 正在统计: ${appName} (DSL ID: ${dslId}, Mode: ${appMode || 'auto-detect'})`);
                
                try {
                    const stats = await getWorkflowStatistics(dslId, appName, startDate, endDate, appMode);
                    statistics.push({
                        appName: appName,
                        dslId: dslId,
                        appMode: appMode || 'auto-detected',
                        ...stats
                    });
                    successCount++;
                } catch (error) {
                    console.error(`❌ ${appName} 统计失败:`, error.message);
                    statistics.push({
                        appName: appName,
                        dslId: dslId,
                        appMode: appMode || 'unknown',
                        totalUsage: 0,
                        userCoverage: 0,
                        error: error.message
                    });
                    failedCount++;
                }
                
                // 避免请求过快
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            sendProgress(95, '生成统计报告...');
            
            // 4. 生成统计报告
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const safeWorkspaceName = sanitizeFileName(workspaceName);
            
            // 生成 CSV 格式的统计报告
            let csvContent = '工作流名称,DSL ID,应用类型,总使用数,用户覆盖数\n';
            statistics.forEach(stat => {
                const appName = (stat.appName || '').replace(/"/g, '""');
                const dslId = stat.dslId || '';
                const appMode = stat.appMode || 'unknown';
                const totalUsage = stat.totalUsage || 0;
                const userCoverage = stat.userCoverage || 0;
                csvContent += `"${appName}","${dslId}","${appMode}",${totalUsage},${userCoverage}\n`;
            });
            
            // 下载 CSV 文件
            const csvFileName = `${safeWorkspaceName}_statistics_${timestamp}.csv`;
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // 添加 BOM 以支持 Excel 中文显示
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = csvFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            sendProgress(100, '完成！');
            
            // 计算总计
            const totalUsage = statistics.reduce((sum, stat) => sum + (stat.totalUsage || 0), 0);
            const totalUserCoverage = new Set();
            statistics.forEach(stat => {
                // 注意：这里无法跨工作流统计用户覆盖数，因为每个工作流的用户是独立的
                // 如果需要跨工作流的用户覆盖数，需要额外的逻辑
            });
            
            console.log(`\n✅ 统计完成！`);
            console.log(`📊 统计结果: 总计 ${apps.length} 个工作流，成功 ${successCount} 个，失败 ${failedCount} 个`);
            console.log(`📈 总使用数: ${totalUsage}`);
            console.log(`💾 CSV 文件已下载: ${csvFileName}`);
            
            return {
                success: true,
                workspaceName: safeWorkspaceName,
                totalWorkflows: apps.length,
                successCount: successCount,
                failedCount: failedCount,
                totalUsage: totalUsage,
                statistics: statistics,
                csvFileName: csvFileName
            };
            
        } catch (error) {
            console.error('❌ 统计过程出错:', error);
            throw error;
        }
    }
    
    // 下载 ZIP 文件
    async function downloadZip(zip, filename) {
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // 发送进度更新
    function sendProgress(percent, text) {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
                type: 'backupProgress',
                percent: percent,
                text: text
            }).catch(() => {}); // 忽略错误
        }
    }
    
    // 备份所有应用
    async function backupAll(config = {}) {
        // 合并配置
        const finalConfig = { ...defaultConfig, ...config };
        defaultConfig.includeSecrets = finalConfig.includeSecrets;
        defaultConfig.includeWorkflowDraft = finalConfig.includeWorkflowDraft;
        
        try {
            console.log('🚀 开始备份 Dify 工作空间...');
            
            // 确保 JSZip 已加载
            if (!window.JSZip) {
                console.log('📦 正在加载 JSZip 库...');
                await loadJSZip();
            }
            
            const JSZip = window.JSZip;
            
            // 0. 检查 CSRF Token
            const csrfToken = getCSRFToken();
            if (!csrfToken) {
                const errorMsg = '❌ 无法获取 CSRF Token！\n\n' +
                    '请尝试以下方法：\n' +
                    '1. 确保已登录 Dify 平台\n' +
                    '2. 刷新页面后重试\n' +
                    '3. 在控制台运行 findCSRFToken() 查看可用的 token\n' +
                    '4. 检查浏览器 Cookie 中是否有 csrf_token 相关的 cookie';
                console.error(errorMsg);
                throw new Error('CSRF Token 未找到');
            }
            console.log('✅ CSRF Token 已获取');
            
            sendProgress(5, '获取工作空间信息...');
            
            // 1. 获取当前工作空间信息
            console.log('🏢 正在获取当前工作空间信息...');
            let currentWorkspace = null;
            let workspaceName = 'workspace';
            try {
                currentWorkspace = await getCurrentWorkspace();
                if (currentWorkspace && currentWorkspace.name) {
                    workspaceName = currentWorkspace.name;
                    console.log(`✅ 当前工作空间: ${workspaceName}`);
                } else {
                    console.warn('⚠️ 无法获取工作空间名称，使用默认名称');
                }
            } catch (e) {
                console.warn('⚠️ 无法获取当前工作空间信息，使用默认名称:', e.message);
            }
            
            // 获取所有工作空间信息（可选，用于兼容性）
            let workspaces = [];
            try {
                const workspaceData = await getWorkspaces();
                // 确保 workspaces 是数组
                if (Array.isArray(workspaceData)) {
                    workspaces = workspaceData;
                    console.log(`✅ 找到 ${workspaces.length} 个工作空间`);
                } else {
                    console.warn('⚠️ 工作空间数据格式异常:', workspaceData);
                    workspaces = [];
                }
            } catch (e) {
                console.warn('⚠️ 无法获取工作空间列表:', e.message);
                workspaces = [];
            }
            
            sendProgress(10, '获取应用列表...');
            
            // 2. 获取应用列表（支持分页）
            console.log('📋 正在获取应用列表...');
            const apps = await getApplications(1, finalConfig.pageLimit);
            console.log(`✅ 找到 ${apps.length} 个应用`);
            
            if (apps.length === 0) {
                throw new Error('当前工作空间没有应用，无需备份');
            }
            
            sendProgress(15, `找到 ${apps.length} 个应用，开始备份...`);
            
            // 3. 备份每个应用（只保存 DSL）
            const dslFiles = []; // 存储 { appName, dslId, dsl } 的数组
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            let successCount = 0;
            let failedCount = 0;
            
            for (let i = 0; i < apps.length; i++) {
                const app = apps[i];
                // 注意：使用 dsl_id 而不是 id
                const dslId = app.dsl_id || app.id || app.app_id;
                const appName = app.name || app.app_name || dslId;
                
                const progress = 15 + Math.floor((i / apps.length) * 70);
                sendProgress(progress, `备份中: ${appName} (${i + 1}/${apps.length})`);
                
                console.log(`📦 [${i + 1}/${apps.length}] 正在备份: ${appName} (DSL ID: ${dslId})`);
                
                try {
                    // 导出 DSL（只保存 dsl 字段）
                    const dsl = await exportAppDSL(dslId);
                    
                    dslFiles.push({
                        appName: appName,
                        dslId: dslId,
                        dsl: dsl
                    });
                    successCount++;
                    console.log(`✅ ${appName} 备份成功`);
                } catch (error) {
                    console.error(`❌ ${appName} 备份失败:`, error.message);
                    failedCount++;
                }
                
                // 避免请求过快
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            sendProgress(90, '生成 ZIP 文件...');
            
            // 4. 创建 ZIP 压缩包
            const zip = new JSZip();
            
            // 将每个 DSL 保存为 YAML 文件
            dslFiles.forEach(({ appName, dslId, dsl }) => {
                try {
                    // 将 DSL 转换为 YAML 格式
                    const yamlContent = jsonToYaml(dsl);
                    // 清理文件名
                    const safeFileName = sanitizeFileName(appName || dslId);
                    const fileName = `${safeFileName}_${dslId}.yml`;
                    
                    // 添加到 ZIP
                    zip.file(fileName, yamlContent);
                    console.log(`📄 已添加文件: ${fileName}`);
                } catch (error) {
                    console.error(`❌ 处理 DSL 文件失败 (${appName}):`, error);
                }
            });
            
            // 5. 生成并下载 ZIP 文件
            // workspaceName 已在步骤1中从 /console/api/workspaces/current 接口获取
            const safeWorkspaceName = sanitizeFileName(workspaceName);
            const zipFileName = `${safeWorkspaceName}_${timestamp}.zip`;
            
            console.log(`\n📦 正在生成 ZIP 文件: ${zipFileName}...`);
            await downloadZip(zip, zipFileName);
            
            sendProgress(100, '完成！');
            
            console.log(`\n✅ 备份完成！`);
            console.log(`📊 统计: 总计 ${apps.length} 个应用，成功 ${successCount} 个，失败 ${failedCount} 个`);
            console.log(`💾 ZIP 文件已下载: ${zipFileName}`);
            console.log(`📁 包含 ${dslFiles.length} 个 YAML 文件`);
            
            return {
                success: true,
                workspaceName: safeWorkspaceName,
                totalApps: apps.length,
                successCount: successCount,
                failedCount: failedCount,
                zipFileName: zipFileName
            };
            
        } catch (error) {
            console.error('❌ 备份过程出错:', error);
            throw error;
        }
    }
    
    // 备份当前应用
    async function backupCurrent() {
        const dslIdMatch = window.location.pathname.match(/\/app\/([^\/]+)/) ||
                          window.location.pathname.match(/\/apps\/([^\/]+)/);
        
        if (!dslIdMatch) {
            throw new Error('无法从 URL 中提取应用 ID，请确保在应用详情页面');
        }
        
        const dslId = dslIdMatch[1];
        const csrfToken = getCSRFToken();
        
        if (!csrfToken) {
            throw new Error('无法获取 CSRF Token');
        }
        
        const dsl = await exportAppDSL(dslId);
        const yamlContent = jsonToYaml(dsl);
        
        const timestamp = new Date().toISOString().slice(0, 10);
        const fileName = `dify_app_${dslId}_${timestamp}.yml`;
        
        const blob = new Blob([yamlContent], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        
        return {
            success: true,
            fileName: fileName
        };
    }
    
    // 导出 API - 确保在脚本执行完成后立即创建
    try {
        // 更新 window.difyBackup 对象
        Object.assign(window.difyBackup, {
            backupAll,
            backupCurrent,
            statisticsAllWorkflows,
            loadJSZip,
            _loading: false,
            _error: null
        });
        
        // 删除占位符属性
        delete window.difyBackup._loading;
        delete window.difyBackup._error;
        
        console.log('✅ Dify 备份脚本已加载，window.difyBackup 已初始化');
        console.log('window.difyBackup 方法:', Object.keys(window.difyBackup));
        
        // 触发自定义事件，通知脚本已加载完成
        if (typeof window.dispatchEvent !== 'undefined') {
            window.dispatchEvent(new CustomEvent('difyBackupReady'));
        }
    } catch (error) {
        console.error('❌ 备份脚本初始化失败:', error);
        console.error('错误堆栈:', error.stack);
        // 即使出错也创建一个基本的对象，避免后续检查失败
        Object.assign(window.difyBackup, {
            backupAll: async () => { throw new Error('备份脚本初始化失败: ' + error.message); },
            backupCurrent: async () => { throw new Error('备份脚本初始化失败: ' + error.message); },
            statisticsAllWorkflows: async () => { throw new Error('备份脚本初始化失败: ' + error.message); },
            loadJSZip: async () => { throw new Error('备份脚本初始化失败: ' + error.message); },
            _loading: false,
            _error: error.message
        });
    }
    
    // 最终确认 window.difyBackup 存在
    if (!window.difyBackup || typeof window.difyBackup !== 'object') {
        console.error('❌ 严重错误：window.difyBackup 仍未定义！');
        window.difyBackup = {
            backupAll: async () => { throw new Error('备份脚本严重错误：window.difyBackup 未定义'); },
            backupCurrent: async () => { throw new Error('备份脚本严重错误：window.difyBackup 未定义'); },
            statisticsAllWorkflows: async () => { throw new Error('备份脚本严重错误：window.difyBackup 未定义'); },
            loadJSZip: async () => { throw new Error('备份脚本严重错误：window.difyBackup 未定义'); }
        };
    }
    
    console.log('✅ 脚本执行完成，window.difyBackup 最终状态:', typeof window.difyBackup, !!window.difyBackup);
})();
