// Node.js 設定情報
exports.PORT = 3000;

// MySQL 接続情報
const mysqlHomeConfig = {
    HOST: 'localhost',
    PORT: 53306,
    DATABASE: 'koken_5',
    USER: 'root',
    PASSWORD: 'Koken4151@'
};
const mysqlConfig = {
    HOST: '192.168.96.199',
    PORT: 3306,
    DATABASE: 'koken_5',
    USER: 'koken_5',
    PASSWORD: 'koken_5'
};
exports.mysqlConfig = mysqlHomeConfig;

// log4js 設定
const log4jsConfig = {
    "appenders": {
        "console": {
            "type": "console"
        },
        "debug": {
            "type": "dateFile",
            "filename": "log/debug.log",
            "pattern": "-yyyy-MM-dd"
        },
        "error": {
            "type": "dateFile",
            "filename": "log/error.log",
            "pattern": "-yyyy-MM-dd"
        }
    },
    "categories": {
        "default": {
            "appenders": [
                "debug"
            ],
            "level": "all"
        },
        "e": {
            "appenders": [
                "console",
                "error"
            ],
            "level": "error"
        }
    }
};
exports.log4jsConfig = log4jsConfig;

// SMTP の設定
const smtpConfig = {
    host: "smtp.gmail.com", // メールサーバー
    port: 587, // ポート番号 25 など
    secure: false, // 465 番ポートを使う場合。それ以外は false
    requireTLS: false,
    tls: {
      rejectUnauthorized: false,
    },
    auth: { // 認証情報
      user: "watuwa3@gmail.com", // ユーザー名
      pass: "eolbqqxbngggbblf", // パスワード
    },
};
exports.smtpConfig = smtpConfig;

// 送信元メールアドレス
exports.SMTPFROM = "watuwa3@gmail.com";

// 送信先メールアドレス
exports.SMTPTO = ["watuwa3.11@gmail.com", "watuwa3@gmail.com"];
