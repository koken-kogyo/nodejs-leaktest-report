# 洩れ検査作業日報支援システム  
- [KMD007JW] 10-leaktest-report  

## 概要  
- 炉中ろう付工程の洩れ検査、黄銅ろう付工程の洩れ検査  
- 炉中ろう付工程の目視検査の作業手順書の入力支援  

## 開発環境  
- Node.js v18.12.1  
- MySQL 8.0.32  
- nvm-windows 1.1.10  

## npmパッケージ
- body-parser@1.20.2                            # Expressミドルウェア  
- csv-stringify@6.4.0                           # CSVファイルの作成  
- ejs@3.1.9  
- express-session@1.17.3  
- express@4.18.2  
- iconv-lite@0.6.3                              # CSVファイルを [Shift_JIS] に変換  
- log4js@6.9.1  
- mysql2@3.5.1  
- nodemailer@6.9.4  
- serve-favicon@2.5.0  

## メンバー  
- y.watanabe  

## プロジェクト構成  
~~~
./
│  .gitignore                                  # ソース管理除外対象
│  config.js                                   # webアプリケーション設定ファイル (git対象外)
│  package.json                                # パッケージ管理ファイル
│  README.md                                   # このファイル
│  server.js                                   # メインとなるサーバー起動ファイル
│  
├─ bat                                        # 本番環境のタスクスケジューラーで使用するスクリプト群
│          koken_1_dump.bat                    # MySQLデータベースのバックアップ、圧縮、転送
│          logBackup.vbs                       # log4jsのログファイルリネーム
│  
├─ handler                                    # ☆サーバー側で使用するハンドラー群
│          mysql.js                            # MySQL関連のハンドラー
│          server.js                           # サーバー側関連のハンドラー
│  
├─ public                                     # ☆クライアントに公開するモジュール群
│  ├─ css
│  │      style-basic.css                     # 共通で使用するスタイルシート
│  │      style-espages.css                   # メインのスタイルシート
│  │
│  ├─ downloads                              # クライアントに提供するファイル群
│  │
│  ├─ imsges                                 # クライアントに提供するファイル群
│  │
│  └─ javascripts                            # 
│          _myfunctions.js                     # 各ページ共通で使用するjs  
│          JsBarcode.all.min.js                # １次元バーコードを表示するjs  
│          qrcode.js                           # QRコードを表示するjs  
│  
├─ settingfiles                               # 設定ファイルのバックアップ用フォルダ・・・ (未使用)
│  
├─ views                                      # ☆EJSテンプレートエンジン群
│          _footer.ejs                         # フッター
│          _header.ejs                         # ヘッダー
│          _myfunctions.ejs                    # ejs用の自作関数
│          index.ejs                           # 洩れ検査日報TopPage
│          iphone.ejs                          # 洩れ検査日報携帯Page
│          login.ejs                           # ログイン画面
│          search.ejs                          # 日報検索画面
│  
└─ specification
        [KMD007JW] xxx 機能仕様書_Ver.1.0.0.0.xlsx
    
~~~
