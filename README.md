
# 群面模拟器｜电商运营（Vite + React + TS）

## 本地运行
1. 安装 Node.js (LTS)
2. 在项目根目录执行：
   ```bash
   npm install
   npm run dev
   ```
3. 打开浏览器访问 http://localhost:5173

## 构建与部署（Vercel 推荐）
- 方式A（推荐）：**直接把整个项目文件夹上传到 Vercel**
  1. 登录 vercel.com → Add New → Project → Import → 上传 zip
  2. 保持默认（framework: Vite），点击 Deploy
  3. 等待完成，获得 https://xxxx.vercel.app 链接

- 方式B：本地构建后上传 `dist/` 静态文件
  ```bash
  npm run build
  ```
  然后将 `dist` 压缩上传到支持静态站点的服务。
