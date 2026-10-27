# 步步驚魂 Step by Scream

提著燈爬上萬聖節的螺旋無限樓梯。手機直式 3D 網頁小遊戲。

正式連結：https://step-by-scream.web-interactive.org

## 玩法

- **點擊或往左滑**：上一階；**往右滑**：下一階；**左下角「跳」**：閃過滾下來的南瓜燈。
- 幽靈會在階梯上忽隱忽現，要趁它消失時走過去。
- 提燈的燈油會一直減少，撿糖果補回來；燈油歸零或被障礙撞到都會扣愛心，3 顆扣光就結束。
- 分數 = 爬到的最高階數 + 糖果數 × 5。爬到世界知名建築的階數，結果頁會有地標彩蛋：比薩斜塔 294、自由女神像 377、胡夫金字塔 560、艾菲爾鐵塔 1,665、台北101 2,046、東京晴空塔 2,523、哈里發塔 2,909 階（資料在 `src/components/landmarkArts.ts`）。
- 第一次進遊戲會有新手教學，之後可以從 HUD 重新打開。

## 技術

| 項目 | 使用 |
|---|---|
| 框架 | Vue 3 + Quasar 2（`@quasar/app-vite`，Vite 2）+ TypeScript |
| 3D | three.js，自訂抖色（dither）shader 營造像素風 |
| 狀態 | Pinia |
| 樣式 | Tailwind CSS + SCSS |
| 音效 | Web Audio API 即時合成，沒有音檔 |
| 監控 / 埋點 | Sentry（`@sentry/vue`）、Google Tag Manager |
| 部署 | Cloudflare Workers 靜態資產（wrangler） |

## 開發

需要 Node.js 20 以上（見 `.nvmrc`）。

```bash
npm install
npm run dev              # 開發環境，http://localhost:9000
npm run dev:staging      # 用 staging 的環境變數
npm run dev:production   # 用 production 的環境變數
npm run lint
npm run format
```

開發環境，或任何環境的網址加上 `?debug=true` 時，`window.game` 會掛上遊戲實例，方便在 console 除錯；development、staging 環境加 `?debug=true` 會再載入 vConsole（手機上看 console）。

### 環境變數

放在 `variables/` 資料夾（已被 `.gitignore` 排除，需另外取得），由 `variables/parser.js` 依 `ENVIRONMENT` 合併 `.env` 與 `.env.<環境>`：

| 變數 | 用途 |
|---|---|
| `QUASAR_ENVIRONMENT` | `development` / `staging` / `production`，送進 Sentry 的 environment |
| `QUASAR_GTM_ID` | Google Tag Manager 容器 ID，空值就不載入 |
| `QUASAR_SENTRY_DSN` | Sentry DSN，空值就不啟用 |

## 建置與部署

```bash
npm run build:staging       # 輸出到 dist/spa，--debug：不壓縮、保留 sourcemap
npm run build:production
make deploy-prd             # 詢問版本號 → build:production → wrangler deploy
```

- `Makefile` 與 `wrangler.jsonc` 已被 `.gitignore` 排除，需另外取得。
- 部署使用 `wrangler login` 的 OAuth 登入。
- Vue Router 是 history 模式，`wrangler.jsonc` 設定 `not_found_handling: "single-page-application"`，子路徑都回傳 `index.html`。

### 版本發布流程

1. 在 `develop` 開發、commit。
2. 更新 `package.json` 版本號，commit `chore: 版本號 x.y.z`。
3. `main` 以 `--no-ff` 合併 `develop`，commit 訊息 `release: vx.y.z`，打上 annotated tag `vx.y.z`。
4. 推送 `develop`、`main` 與 tag，再執行 `make deploy-prd`。

## 專案結構

```
src/
├── boot/          # 啟動時執行：gtm、sentry、chunk-reload、touch-guard、vconsole
├── game/          # 遊戲核心（純 TS + three.js，不依賴 Vue）
│   ├── StairGame.ts   # 遊戲主迴圈、難度參數、計分
│   ├── hazards.ts     # 幽靈、南瓜燈、糖果
│   ├── builders.ts    # 樓梯、角色、場景物件建模
│   ├── dither.ts      # 抖色 shader
│   ├── sound.ts       # Web Audio 音樂與音效
│   └── quality.ts     # 依裝置效能自動調整畫質
├── pages/         # 首頁、角色選擇、遊戲、結果、404
├── components/    # HUD、教學、跳窗、像素圖、地標彩蛋等
├── utils/         # 遊戲 session、滑動手勢、教學流程、埋點、預載
├── stores/        # Pinia：角色、上一場結果、教學是否看過、畫質
├── layouts/       # MainLayout：預載資源、依畫面大小縮放字級
└── css/app.scss   # 全域樣式與共用動畫
```

## 開發備註

- **難度調整**：數值集中在 `src/game/StairGame.ts` 開頭的常數（`TIER_AT`、`FUEL_DURATION`、`GHOST_*`、`PUMPKIN_*`、`CANDY_*` 等）與 `src/game/hazards.ts`。完整說明在 `document/遊戲機制說明.md`（本機文件，未納入 git），調整數值時請一併更新。
- **部署後舊頁面**：`src/boot/chunk-reload.ts` 會在動態載入頁面失敗（舊版 chunk 已不存在）時自動重新整理一次，10 秒內不重複。
- **App 內建瀏覽器**：`src/boot/touch-guard.ts` 擋掉原生 `touchmove`，並讓 document 停在捲動中段，避免 Threads / Instagram 內建瀏覽器下滑時把網頁關掉。從螢幕左邊緣滑動是 App 原生手勢，網頁擋不了。
- **埋點事件**：`level_start`、`level_end`、`post_score`（`src/utils/track.ts`）。
- **程式風格**：`.vue` 檔維持 200 行內，過長就拆出 composable / 子元件 / 資料檔；程式碼不寫註解。
