# 拼音追逃

手机浏览器拼音打字追逐游戏。玩家照着拼音提示使用原生键盘输入，答对前进，答错会被敌人追近。关卡无尽，难度持续上升。

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## 部署

将 `npm run build` 生成的 `dist/` 目录部署到任意静态网站托管服务。
