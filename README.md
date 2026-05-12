# Taylor Swift Song Challenge

![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.x-646cff?logo=vite&logoColor=white)
![iTunes API](https://img.shields.io/badge/iTunes-API-fa243c?logo=apple&logoColor=white)

一个基于 Vue 3 + TypeScript + Vite 的 Taylor Swift 猜歌小游戏。

页面会从本地曲库中随机抽取一首歌曲，再通过代理服务请求 iTunes Search API 获取该曲目的 30 秒试听地址。用户可以先听一段随机截取的音频片段进行猜歌，随后再查看曲目信息。

## Features

- 基于 `public/song.json` 的本地曲库随机抽歌
- 使用 iTunes Search API 查询歌曲试听地址
- 支持设置猜歌片段时长，范围为 `1` 到 `30` 秒
- 未揭晓前只播放固定随机起点的指定秒数片段
- 揭晓后从试听开头完整播放到结尾
- 点击“重新抽取曲目”后自动播放；首次页面加载不自动播放
- 内置 5 秒请求冷却，避免连续请求接口
- 已配置 GitHub Pages 自动部署
- 支持通过 Render 部署 iTunes 代理服务

## Tech Stack

- Vue 3
- TypeScript
- Vite

## Project Structure

```text
.
├── public/
│   └── song.json              # 本地曲库数据
├── server/
│   └── index.ts               # Express + axios 代理服务
├── src/
│   ├── components/
│   │   └── PreviewPlayer.vue  # 试听播放器
│   ├── services/
│   │   └── itunes.ts          # 前端调用代理服务
│   ├── App.vue                # 主页面
│   ├── main.ts                # 应用入口
│   └── style.css              # 全局样式
├── .github/workflows/
│   └── deploy.yml             # GitHub Pages 部署工作流
├── package.json
├── vite.config.ts
└── README.md
```

## For Users

直接访问在线版本：

<https://dream-oyh.github.io/TS-Song/>

## For Developers

### 1. Install dependencies

```bash
npm install
```

### 2. Start local development server

推荐直接使用一键启动命令：

```bash
npm run dev:all
```

如果需要手动分别启动，也可以使用两个终端：

先启动本地代理服务：

```bash
npm run server
```

再启动前端开发服务器：

```bash
npm run dev
```

默认情况下，Vite 会输出一个本地地址，例如：

```text
http://localhost:5173/
```

如果 `5173` 端口被占用，Vite 会自动切换到其他端口。

本地开发时，Vite 会通过开发代理把 `/api` 请求转发到：

```text
http://localhost:8787
```

### 3. Build for production

```bash
npm run build
```

构建产物会输出到 `dist/` 目录。

### 4. Preview production build locally

```bash
npm run preview
```

### Environment variables

生产环境通过 `VITE_API_BASE_URL` 指定代理服务地址。

当前线上环境使用：

```env
VITE_API_BASE_URL=https://ts-song.onrender.com
```

参考文件：

- [.env.production](/home/forrest/data/repo/Other/TS/.env.production)
- [.env.example](/home/forrest/data/repo/Other/TS/.env.example)

## Contribution

欢迎提交问题反馈、改进建议或代码贡献。

建议流程如下：

1. Fork 本仓库
2. 从最新主分支创建一个新的功能分支
3. 在本地安装依赖并完成开发
4. 运行 `npm run build`，确认项目可以正常构建
5. 提交改动并推送到你的远程分支
6. 发起 Pull Request，并简要说明修改内容与影响范围

提交前建议确认：

- 不提交 `node_modules/`、`dist/` 或其他本地产物
- 如果修改了曲库数据，保持 `public/song.json` 的字段结构一致
- 如果修改了部署、路径或运行方式，请同步更新 README

## Deployment

### Frontend

前端通过 GitHub Pages 部署，仓库中已经包含对应 workflow：

- [.github/workflows/deploy.yml](/home/forrest/data/repo/Other/TS/.github/workflows/deploy.yml)

当前 Pages 地址：

<https://dream-oyh.github.io/TS-Song/>

### Proxy service

代理服务通过 Render 部署，线上地址为：

<https://ts-song.onrender.com>

健康检查地址：

<https://ts-song.onrender.com/api/health>

代理服务职责：

- 接收前端请求
- 由服务端请求 iTunes Search API
- 将歌曲预览数据返回给前端

这样可以避免移动端浏览器直接请求 iTunes 时出现重定向、跨域或协议拦截问题。

## License

This project is for educational and personal project use.
