# 安装指南

## 快速开始

### 1. 准备文件

确保以下文件存在：

```
dify-backup-extension/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── background.js
├── backup-script.js
├── backup-current-script.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 2. 确认 JSZip 库存在（必需）

扩展需要 `jszip.min.js` 文件才能正常工作。如果文件不存在，需要下载：

**方法1：使用 curl**
```bash
cd dify-backup-extension
curl -o jszip.min.js https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
```

**方法2：手动下载**
1. 访问：https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
2. 右键保存为 `jszip.min.js`
3. 放到 `dify-backup-extension` 目录

**注意**：扩展只使用本地的 `jszip.min.js` 文件，不会从网络下载。

### 3. 准备图标

如果没有图标文件，可以：

**方法1：使用在线工具生成**
- 访问：https://www.favicon-generator.org/
- 上传图片或输入文字
- 下载并解压到 `icons` 目录

**方法2：使用占位图片**
- 创建简单的 PNG 图片（16x16, 48x48, 128x128）
- 或使用纯色图片

### 4. 加载到 Chrome

1. **打开扩展管理页面**
   - 在 Chrome 地址栏输入：`chrome://extensions/`
   - 或：菜单 → 更多工具 → 扩展程序

2. **启用开发者模式**
   - 点击右上角的"开发者模式"开关

3. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择 `dify-backup-extension` 文件夹
   - 点击"选择文件夹"

4. **验证安装**
   - 扩展应该出现在扩展列表中
   - 浏览器工具栏应该显示扩展图标

## 使用扩展

### 首次使用

1. 访问 Dify 平台并登录
2. 点击浏览器工具栏中的扩展图标
3. 在弹出窗口中配置选项
4. 点击"开始备份"

### 常见问题

**Q: 扩展图标不显示？**
A: 检查扩展是否已启用，尝试刷新页面

**Q: 点击按钮没有反应？**
A: 确保已登录 Dify 平台，检查浏览器控制台是否有错误

**Q: JSZip 加载失败？**
A: 确保 `jszip.min.js` 文件存在于扩展目录中，然后重新加载扩展

## 卸载

1. 访问 `chrome://extensions/`
2. 找到"Dify 应用配置备份工具"
3. 点击"移除"
4. 确认删除

## 更新

1. 下载新版本文件
2. 在 `chrome://extensions/` 中点击扩展的"重新加载"按钮
3. 或先卸载再重新安装

