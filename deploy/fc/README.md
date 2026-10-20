# FC 部署目录

阿里云函数计算的运行文件：

```text
deploy/fc/
├─ package.json
├─ package-lock.json
├─ server.js
├─ server/
├─ node_modules/
└─ dist/
```

`package.json` 和锁文件列出服务端运行依赖。服务端和页面在源码目录修改，打包时同步到这里

在项目根目录运行：

```powershell
npm run package:fc
```

上传文件为 `releases/niyun-zhitan-fc.zip`，包含上面列出的运行文件。`node_modules/` 通过 `npm ci --omit=dev` 安装并随包上传，FC 可直接启动
