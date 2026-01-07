# Dify 应用配置备份工具

> 一款强大的 Chrome 浏览器扩展，用于一键备份 Dify 工作空间的所有应用 DSL 配置为 YAML 文件并打包为 ZIP。

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)](manifest.json)

## 📋 目录

- [功能特性](#功能特性)
- [安装指南](#安装指南)
- [快速开始](#快速开始)
- [使用说明](#使用说明)
- [配置选项](#配置选项)
- [技术架构](#技术架构)
- [故障排查](#故障排查)
- [开发指南](#开发指南)
- [更新日志](#更新日志)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## ✨ 功能特性

### 核心功能

- ✅ **一键备份**：点击按钮即可备份所有应用，无需手动操作
- ✅ **批量导出**：支持分页获取，自动处理大量应用
- ✅ **YAML 格式**：每个 DSL 保存为独立的 YAML 文件，便于阅读和编辑
- ✅ **ZIP 打包**：自动打包为 ZIP 压缩包，方便管理和传输
- ✅ **进度显示**：实时显示备份进度，清晰了解当前状态
- ✅ **单应用备份**：支持备份当前正在查看的应用
- ✅ **离线支持**：内置 JSZip 库，支持离线环境使用

### 高级特性

- 🔒 **安全认证**：自动获取 CSRF Token 和认证信息
- ⚙️ **灵活配置**：支持包含敏感信息、工作流草稿等选项
- 🎯 **智能识别**：自动识别应用 ID 和名称
- 📊 **详细统计**：显示成功/失败数量统计
- 🔄 **自动重试**：支持分页自动获取所有应用

## 🚀 安装指南

### 前置要求

- Chrome 浏览器（或基于 Chromium 的浏览器，如 Edge、Brave 等）
- 已登录的 Dify 平台账号
- 网络连接（用于下载 JSZip 库，如果本地没有）

### 安装步骤

#### 1. 下载扩展文件

将整个 `dify-backup-extension` 文件夹下载到本地。

#### 2. 准备 JSZip 库（必需）

扩展需要 `jszip.min.js` 文件才能正常工作。如果文件不存在，需要下载：

**方法1：使用 curl（推荐）**
```bash
cd dify-backup-extension
curl -o jszip.min.js https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
```

**方法2：手动下载**
1. 访问：https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
2. 右键保存为 `jszip.min.js`
3. 放到 `dify-backup-extension` 目录

**注意**：扩展只使用本地的 `jszip.min.js` 文件，不会从网络下载。

#### 3. 准备图标文件

在 `icons` 目录下放置以下图标文件（16x16, 48x48, 128x128 像素）：
- `icon16.png`
- `icon48.png`
- `icon128.png`

如果没有图标，可以使用在线工具生成，或暂时使用占位图片。

#### 4. 加载到 Chrome

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择 `dify-backup-extension` 文件夹
6. 扩展安装完成！✅

### 验证安装

安装成功后，你应该看到：
- 扩展出现在扩展列表中
- 浏览器工具栏显示扩展图标
- 点击图标可以打开弹出窗口

## 🎯 快速开始

### 备份所有应用

1. **登录 Dify 平台**
   - 在浏览器中打开并登录你的 Dify 实例

2. **打开扩展**
   - 点击浏览器工具栏中的扩展图标 🎯
   - 弹出窗口会显示当前页面信息

3. **配置选项**（可选）
   - ☑️ **包含敏感信息**：是否备份 Secret 类型的环境变量
   - ☑️ **包含工作流草稿**：是否包含工作流草稿配置

4. **开始备份**
   - 点击 **"📦 开始备份"** 按钮
   - 等待进度条完成
   - ZIP 文件会自动下载到浏览器默认下载目录

### 备份当前应用

1. **进入应用详情页面**
   - 在 Dify 平台中打开任意应用的详情页

2. **打开扩展并点击**
   - 点击扩展图标
   - 点击 **"📄 备份当前应用"** 按钮
   - YAML 文件会自动下载

## 📖 使用说明

### 备份文件格式

#### 所有应用备份

- **文件名格式**：`workspace_YYYY-MM-DDTHH-MM-SS.zip`
- **内容**：包含多个 YAML 文件，每个应用一个
- **文件命名**：`应用名称_应用ID.yml`

示例：
```
workspace_2024-01-15T10-30-45.zip
├── 智能客服助手_abc123.yml
├── 文档问答系统_def456.yml
└── 数据分析工具_ghi789.yml
```

#### 单个应用备份

- **文件名格式**：`dify_app_应用ID_YYYY-MM-DD.yml`
- **内容**：单个应用的 DSL 配置（YAML 格式）

### 配置选项说明

#### 包含敏感信息（include_secret）

- **默认**：关闭
- **作用**：控制是否在备份中包含 Secret 类型的环境变量
- **建议**：生产环境建议关闭，开发环境可以开启

#### 包含工作流草稿（include_workflow_draft）

- **默认**：关闭
- **作用**：控制是否包含工作流草稿配置
- **建议**：如果需要备份未发布的工作流，可以开启

### 使用技巧

1. **首次使用**：建议先备份一个应用测试功能
2. **大量应用**：备份大量应用时可能需要较长时间，请耐心等待
3. **网络环境**：确保网络连接稳定，避免备份中断
4. **定期备份**：建议定期备份，避免数据丢失

## 🏗️ 技术架构

### 文件结构

```
dify-backup-extension/
├── manifest.json              # 扩展配置文件
├── popup.html                 # 弹出窗口 HTML
├── popup.css                  # 弹出窗口样式
├── popup.js                   # 弹出窗口逻辑
├── content.js                 # 内容脚本（注入到页面）
├── background.js              # 后台服务脚本
├── backup-script.js           # 备份核心逻辑（页面上下文）
├── page-context-helper.js     # 页面上下文辅助脚本
├── jszip.min.js               # JSZip 库（需下载）
├── icons/                     # 图标目录
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md                  # 说明文档
```

### 架构说明

#### 脚本执行上下文

1. **Content Script (`content.js`)**
   - 运行在隔离的上下文中
   - 负责与 popup 通信
   - 加载页面上下文脚本

2. **Page Context Scripts**
   - `backup-script.js`：备份核心逻辑
   - `page-context-helper.js`：消息处理辅助
   - 运行在页面上下文中，可以访问页面的 DOM 和 API

3. **Popup Script (`popup.js`)**
   - 处理用户界面交互
   - 发送消息给 content script

#### 通信流程

```
Popup → Content Script → Page Context Helper → Backup Script
  ↑                                                      ↓
  └─────────────────── 结果返回 ─────────────────────────┘
```

### 核心技术

- **Chrome Extension Manifest V3**：使用最新的扩展规范
- **JSZip**：客户端 ZIP 文件生成
- **Fetch API**：调用 Dify API
- **PostMessage**：跨上下文通信
- **Content Security Policy (CSP)**：符合 CSP 规范，不使用内联脚本

## 🔧 故障排查

### 常见问题

#### 1. 扩展图标不显示

**可能原因**：
- 扩展未启用
- 图标文件缺失或损坏

**解决方法**：
1. 访问 `chrome://extensions/` 检查扩展是否已启用
2. 确认图标文件存在于 `icons/` 目录
3. 尝试刷新页面或重新加载扩展

#### 2. 点击按钮没有反应

**可能原因**：
- 未登录 Dify 平台
- Content Script 未正确注入
- 页面加载未完成

**解决方法**：
1. 确保已登录 Dify 平台
2. 打开浏览器控制台（F12）查看错误信息
3. 刷新页面后重试
4. 检查扩展是否正确安装

#### 3. CSRF Token 错误

**错误信息**：`无法获取 CSRF Token`

**可能原因**：
- 未登录或登录已过期
- Cookie 被清除
- 页面未完全加载

**解决方法**：
1. 刷新 Dify 页面
2. 重新登录 Dify 平台
3. 检查浏览器 Cookie 是否正常
4. 在控制台运行 `checkDifyBackupStatus()` 查看状态

#### 4. JSZip 加载失败

**错误信息**：`无法加载本地 JSZip 库`

**可能原因**：
- `jszip.min.js` 文件不存在
- 文件路径错误
- 文件损坏

**解决方法**：
1. 确认 `jszip.min.js` 文件存在于扩展目录
2. 检查文件是否损坏，可以重新下载
3. 重新加载扩展（在 `chrome://extensions/` 中点击"重新加载"按钮）
4. 检查 `manifest.json` 中 `web_accessible_resources` 配置

#### 5. 备份失败

**错误信息**：`API 调用失败` 或 `备份过程出错`

**可能原因**：
- 网络连接问题
- Dify API 端点错误
- 权限不足
- 应用数量过多导致超时

**解决方法**：
1. 打开浏览器控制台查看详细错误信息
2. 检查网络连接是否正常
3. 确认有足够的权限访问应用
4. 尝试刷新页面后重试
5. 如果应用数量很多，可能需要等待更长时间

#### 6. Content Security Policy (CSP) 错误

**错误信息**：`Refused to execute inline script`

**可能原因**：
- 页面有严格的 CSP 策略
- 使用了内联脚本（已修复）

**解决方法**：
- 扩展已修复此问题，使用外部脚本文件
- 如果仍有问题，请更新到最新版本

### 调试技巧

#### 查看扩展日志

1. 在 `chrome://extensions/` 中找到扩展
2. 点击 **"检查视图"** → **"service worker"** 或 **"popup"**
3. 打开开发者工具查看日志

#### 查看页面日志

1. 在 Dify 页面按 F12 打开开发者工具
2. 切换到 **Console** 标签
3. 查看备份过程中的日志信息

#### 测试 API 连接

在浏览器控制台运行：

```javascript
// 测试获取 CSRF Token
function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name.toLowerCase().includes('csrf')) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

console.log('CSRF Token:', getCSRFToken());

// 检查备份脚本状态
if (typeof checkDifyBackupStatus === 'function') {
    console.log('备份状态:', checkDifyBackupStatus());
}
```

## 💻 开发指南

### 开发环境设置

1. **克隆或下载项目**
   ```bash
   git clone <repository-url>
   cd dify-backup-extension
   ```

2. **准备依赖**
   - 下载 `jszip.min.js`（见安装指南）
   - 准备图标文件

3. **加载扩展**
   - 按照安装指南加载扩展
   - 开启开发者模式以便调试

### 修改配置

#### 修改扩展信息

编辑 `manifest.json`：
- `name`：扩展名称
- `version`：版本号
- `description`：描述信息
- `icons`：图标路径

#### 自定义样式

编辑 `popup.css` 可以自定义弹出窗口的样式。

#### 修改备份逻辑

主要逻辑在 `backup-script.js` 中：
- `backupAll()`：备份所有应用
- `backupCurrent()`：备份当前应用
- `loadJSZip()`：加载 JSZip 库
- `callDifyAPI()`：调用 Dify API

### 调试方法

1. **Popup 调试**
   - 在 `chrome://extensions/` 中点击扩展的"检查视图" → "popup"
   - 打开开发者工具

2. **Content Script 调试**
   - 在 Dify 页面按 F12
   - 在 Console 中查看日志
   - 可以调用 `checkDifyBackupStatus()` 检查状态

3. **Background Script 调试**
   - 在 `chrome://extensions/` 中点击扩展的"检查视图" → "service worker"
   - 打开开发者工具

### 构建和发布

当前版本为开发版本，如需发布到 Chrome Web Store：

1. 准备所有必需文件
2. 创建 ZIP 压缩包（不包含 `.git` 等开发文件）
3. 在 Chrome Web Store 开发者控制台提交
4. 等待审核通过

## 📝 更新日志

### v1.0.0 (2024-01-15)

#### 新增功能
- ✅ 支持备份所有应用
- ✅ 支持备份当前应用
- ✅ 支持 YAML 格式导出
- ✅ 支持 ZIP 打包
- ✅ 支持进度显示
- ✅ 支持配置选项（包含敏感信息、工作流草稿）
- ✅ 支持分页获取应用列表
- ✅ 支持自动获取 CSRF Token
- ✅ 符合 Content Security Policy (CSP) 规范

#### 技术改进
- 🔧 使用 Manifest V3
- 🔧 使用外部脚本文件，避免 CSP 问题
- 🔧 优化错误处理机制
- 🔧 改进用户界面和体验

#### 已知问题
- 大量应用备份时可能需要较长时间
- 某些特殊字符在文件名中会被替换为下划线

## ❓ 常见问题

### Q: 支持哪些浏览器？

A: 支持所有基于 Chromium 的浏览器，包括：
- Google Chrome
- Microsoft Edge
- Brave
- Opera
- 其他 Chromium 内核浏览器

### Q: 是否需要网络连接？

A: 
- 首次安装需要下载 `jszip.min.js` 文件
- 备份过程需要网络连接以访问 Dify API
- JSZip 库已内置，不需要在线下载

### Q: 备份的数据安全吗？

A: 
- 所有数据在本地处理，不会上传到第三方服务器
- ZIP 文件直接下载到本地
- 建议妥善保管备份文件

### Q: 可以备份哪些内容？

A: 
- 应用的 DSL 配置
- 可选：Secret 类型的环境变量
- 可选：工作流草稿配置

### Q: 备份文件可以恢复吗？

A: 
- 备份文件是标准的 YAML 格式
- 可以通过 Dify 平台的导入功能恢复
- 具体恢复方法请参考 Dify 官方文档

### Q: 支持私有部署的 Dify 吗？

A: 
- 支持，只要可以通过浏览器访问即可
- 支持 HTTP 和 HTTPS
- 支持自定义域名和端口

### Q: 如何更新扩展？

A: 
1. 下载新版本文件
2. 在 `chrome://extensions/` 中点击扩展的"重新加载"按钮
3. 或先卸载再重新安装

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 如何贡献

1. **报告问题**
   - 在 GitHub Issues 中创建新 issue
   - 详细描述问题和复现步骤
   - 附上错误日志和截图（如有）

2. **提交代码**
   - Fork 项目
   - 创建功能分支
   - 提交更改
   - 创建 Pull Request

3. **提出建议**
   - 在 GitHub Issues 中创建 feature request
   - 详细描述功能需求和使用场景

### 开发规范

- 遵循现有代码风格
- 添加必要的注释
- 更新相关文档
- 测试新功能

## 📄 许可证

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 创建 GitHub Issue
- 发送邮件（如有）

## 🙏 致谢

- [JSZip](https://stuk.github.io/jszip/) - 强大的 JavaScript ZIP 库
- [Dify](https://dify.ai/) - 优秀的 LLM 应用开发平台
- Chrome Extension API - 强大的浏览器扩展能力

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**
