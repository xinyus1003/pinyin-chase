# 拼音追逃

手机浏览器拼音打字追逐游戏。玩家照着拼音提示使用原生键盘输入，答对前进，答错会被敌人追近。关卡无尽，难度持续上升。

## 本地运行

需要 Node.js `^20.19.0` 或 `>=22.12.0`（Vite 8 要求）。

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

将 `npm run build` 生成的 `dist/` 目录部署到静态网站托管服务。

当前构建默认面向**根路径**托管（如 Vercel、Netlify、S3 根目录、自定义域名）。渲染产物
`dist/index.html` 使用 `/assets/...` 绝对路径引用资源，因此部署到根路径可正常工作。

若需部署到**子路径**（例如 GitHub Pages 项目页 `https://<user>.github.io/<repo>/`），
需先为 Vite 设置 base 后重新构建，例如：

```bash
npm run build -- --base=/<repo>/
```

或等价地在 `vite.config.ts` 中设置 `base: '/<repo>/'` 并重新运行 `npm run build`。
