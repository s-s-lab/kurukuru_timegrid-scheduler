# TimeGrid Scheduler MVP

Google Apps Script + Google スプレッドシートをバックエンドにし、GitHub Pagesで公開する時間単位の日程調整ツールです。

## ファイル構成

- `index.html` トップページ
- `create.html` イベント作成画面
- `event.html` イベント回答画面
- `admin.html` 管理画面
- `css/style.css` 共通CSS
- `js/config.js` GAS WebアプリURL設定
- `js/api.js` API共通処理
- `js/create.js` 作成画面ロジック
- `js/event.js` 回答画面ロジック
- `js/admin.js` 管理画面ロジック

## 初期設定

1. Google スプレッドシートを作成する
2. Apps Script に `backend/Code.gs` を貼り付ける
3. `SPREADSHEET_ID` は `1yuKgsBEhYlFMvstCEm75AQoE333UKcDVllzT8npxmlw` に設定済み
4. Apps Script で `setupSheets()` を一度実行する
5. Webアプリとしてデプロイする
6. 発行されたURLを `frontend/js/config.js` の `GAS_WEB_APP_URL` に設定する
7. frontendフォルダをGitHub Pagesで公開する
