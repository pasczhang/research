# 个人投资研究系统

静态站点，可直接发布到任意静态托管（Nginx、GitHub Pages、Netlify、Vercel、对象存储）。

## 本地预览

```bash
npx --yes serve -l 4173
```

浏览器打开 `http://localhost:4173`。

或使用 Python：

```bash
python -m http.server 4173
```

## 发布

将项目内全部文件上传到托管目录，网站入口为 `index.html`。无需构建步骤、无需后端。

首页指数每 15 秒刷新一次，数据来自东方财富公开行情接口，可能存在延迟，仅供研究参考。
