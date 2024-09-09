const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");
const favicon = require("serve-favicon");
// User定義
const { PORT, log4jsConfig } = require("./config.js");
const mysqlHandler = require("./handlers/mysql.js");
const userid = "";
const { login, login2, loginCheck, csvwrite, sendMail, myOS } = require("./handlers/server.js");
// log4jsロガー設定
const log4js = require("log4js");
log4js.configure(log4jsConfig);

// Expressインスタンスを生成
const app = express();

const fs = require("fs");
const https = require("https");
const options = {
  key:  fs.readFileSync("./servercert/server.key"),
  cert: fs.readFileSync("./servercert/server.crt")
};
const server = https.createServer(options,app);

// テンプレートエンジンの設定
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ミドルウエアの設定
app.use(session({ secret: "YOUR SECRET SALT", resave: true, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/static", express.static("./public"));
app.use(favicon(`${__dirname}/public/images/favicon.ico`));

// Top Page
app.get( "/", (req, res) => res.redirect(`https://${req.hostname}/`));

// ユーザー認証
app.get( "/login", (req, res) => res.render("login.ejs", {err: "", userid}));
app.post("/login", (req, res) => login(req, res));
app.get("/logout", (req, res) => req.session.destroy(() => res.redirect(`https://${req.hostname}/`)));
app.get("/direct/:userid/:password/:nextaddr/:odcd", (req, res) => login2(req, res));
app.get("/directerror/:userid", (req, res) => {
    const userid = req.params.userid;
    res.render("login.ejs", {err: "自動ログイン設定を確認してください", userid})
});

// ******************************* 炉中洩れ検査用ハンドラー始 *********************************
// 帳票の入力完了時処理
// APIテスト (CTRL+クリックで登録出来るよ)
// http://192.168.96.189:3000/ireporegist/md/60707:T1855-70743:60:58:11014/::::2::/::::2::/コメント:
// http://192.168.96.189:3000/ireporegist/md/60708:RD158-63171:63:62:11014/::::1::/::::1::/コメント:
// http://192.168.96.189:3000/ireporegist/md/60708:RP471-62123-B:200:179:11014/1:2:3:4:5:6:/1:2:3:4:5:6:/壊滅的:
// http://192.168.96.189:3000/ireporegist/md/60707:1294xx-59xxx:200:198:11014/::::2::/::::1::/マスタ存在チェック用:
// http://192.168.96.189:3000/ireporegist/md/60707:129486-59120:200:198:xx014/::::2::/::::1::/担当者存在チェック用:
// http://192.168.96.189:3000/ireporegist/md/60708:RD158-63171:63:62:11014/::::1::/::::1::/日報もれ:
// http://192.168.96.189:3000/ireporegist/md/60708:1J802-73311             :1:1:11014/::::::/::::::/:リンク出来ないので直接張り付けて:
// API実績計上なしエラーテスト
// http://192.168.96.189:3000/ireporegist/md/60708:RC691-62133:4:4:11014/::::::/::::::/実績なし品番61301:
// http://192.168.96.189:3000/ireporegist/md/60708:17960-83H50-000:10:10:11014/::::::/::::::/実績あり品番61301:
// API登録テスト(テスト環境)
// https://pc090n:53010/ireporegist/md/60797:129486-59120:200:198:11014/::::2::/::::1::/修正不可:10898:11178:2:
// https://pc090n:53010/ireporegist/md/60797:129486-59120:200:198:11014/::::2::/::::1::/修正不可:::1:
// https://pc090n:53010/ireporegist/bw/60500:32B35-06301:100:100:20804/::::::/::::::/:::1:
// https://pc090n:53010/ireporegist/md/60717:RA231-62131-B:38:38:20804/::::::/::::::/:::1:

// API登録テスト(本番環境)
// https://koken:53010/ireporegist/BW/60500:3B291-82732-S:1:1:11040/::::::/::::::/手もれ:::1:
// API登録テスト
// https://192.168.3.197:53010/ireporegist/bw/60798:RA168-63223:10:8:11014/0:0:0:0:0:2:/0:0:0:0:0:1:/:2:
// https://192.168.3.197:53010/ireporegist/md/60707:129486-59120:200:198:11014/::::2::/::::1::/修正不可:1:
// API実績計上なしエラーテスト
// http://192.168.3.197:3000/ireporegist/md/60707:T1855-70743:80:78:11014/::::1:1:/::::1:1:/コメント:1:
// http://192.168.3.197:3000/ireporegist/md/60707:129486-59140:200:179:11014/1:2:3:4:5:6:/1:2:3:4:5:6:/壊滅的:1:
// APIエラーテスト
// http://192.168.3.197:3000/ireporegist/md/60707:1294xx-59xxx:200:198:11014/::::2::/::::1::/修正不可:1:
// http://192.168.3.197:3000/ireporegist/md/60707:129486-59120:200:198:xx014/::::2::/::::1::/修正不可:1:
app.get("/ireporegist/:id/:args/:bads/:scraps/:others", async function (req, res, next) {
    try {
        const userid = req.params.id.toUpperCase();
        const args = req.params.args;
        const bads = req.params.bads;
        const scraps = req.params.scraps;
        const others = req.params.others;
        const hmcd = args.split(":")[1].replace('−','-'); // 24.08.19 mod y.w U+2212(MINUS SIGN) 変換←ハンドスキャナーで読み取るとおかしなコードになる
        const operator = args.split(":")[4];
        const entrykbn = others.split(":")[3]; // 1:QR品番 2:三枚複写 3:試作品番
        const d = new Date();
        const planday = d.getFullYear() + "-" + 
            ("0" + (d.getMonth() + 1)).slice(-2) + "-" + 
            ("0" + d.getDate()).slice(-2);

        // 24.03.12 「MySQL勝手に登録されてしまう」これが原因かな？⇒ req.session.nextaddr = `/ireporegist/${userid}/${args}/${bads}/${scraps}/${others}`;
        req.session.nextaddr = `/es`;

        //　i-Reporter登録内容をデバッグログに記録
        const logger = log4js.getLogger();
        logger.debug(`/ireporegist/${userid}/${args}/${bads}/${scraps}/${others}`);

        // 自動ログイン
        const userinfo = await mysqlHandler.getM0010(userid);
        if (userinfo.length == 0) {
            const logger = log4js.getLogger("e");
            logger.error("担当者マスタに存在しない:" + userid);
            return res.render("login.ejs", {err: "ユーザーIDが間違っているか存在しません"});
        } else {
            req.session.userid = userid;
            req.session.jpname = userinfo[0].TANNM;
        }
        
        // 試作品番をノーチェックで登録しリダイレクト
        if (entrykbn == "3") {
            let tempargs = "";
            if (args.substring(0, 4) == "6079") {
                tempargs = "6072" + args.substring(4); //試作品番の場合は実績フラグが取得できないので"6072"固定
            } else {
                tempargs = args;
            }
            let tempodcd = tempargs.split(":")[0];
            await mysqlHandler.insertKD8220(userid, tempargs, bads, scraps, others);
            return res.redirect(`/es/plan/${planday}/${tempodcd}/1`);
        }

        // 通常品番の登録処理
        let ktflg = "";
        let jiflg = false;
        let es01jiflg = false;
        let newargs = "";
        if(args.substring(0, 4) == "6050") {
            //ktflg = await mysqlHandler.isM0510KTCD(hmcd,  "WL01"); // 24.08.19 mod y.w 黄銅洩検の工程チェック方法を変更（仮付け、ベンダー、建機からの洩れ検査も担当する為）
            if (await mysqlHandler.isM0510KTCD(hmcd,  "WL04")) {
                ktflg = false;  // 黄銅と炉中を間違えた場合はエラー
            } else {
                ktflg = true;   // それ以外はチェックなしでスルー
            }
            jiflg = await mysqlHandler.isM0510JIKBN(hmcd, "ES00");
            newargs = args; // 黄銅洩れ検査（実績なし）
        } else if (args.substring(0, 4) == "6070") {
            // ktflg = await mysqlHandler.isM0510KTCD(hmcd,  "WL04"); // 24.08.20 mod y.w 炉中洩検の工程チェック方法を変更（社外ブレージングWLZ406からの洩れ検査に対応）
            if (await mysqlHandler.isM0510KTCD(hmcd,  "WL01")) {
                ktflg = false;  // 黄銅と炉中を間違えた場合はエラー
            } else {
                ktflg = true;   // それ以外はチェックなしでスルー
            }
            jiflg = await mysqlHandler.isM0510JIKBN(hmcd, "ES00");
            newargs = args; // 炉中洩れ検査（実績あり）
        } else if (args.substring(0, 4) == "6079") {
            ktflg = await mysqlHandler.isM0510KTCD(hmcd,  "WL04");
            jiflg = await mysqlHandler.isM0510JIKBN(hmcd, "WL04");
            es01jiflg = await mysqlHandler.isM0510JIKBN(hmcd, "ES01");
            if (jiflg == true) {
                newargs = "6071" + args.substring(4); // 目視検査⇒メッキ他 に自動振り分け（実績あり）
            } else if (es01jiflg == true) {
                newargs = "6071" + args.substring(4); // 形状検査・修正工程⇒メッキ他 に自動振り分け（実績あり）
            } else {
                newargs = "6072" + args.substring(4); // 目視検査⇒洩れ検査行き に自動振り分け（実績なし）
            }
        } else {
            const logger = log4js.getLogger("e");
            logger.error("手配先コードが確認出来ません:" + args.substring(0, 5));
            return res.render("index.ejs", {req, planday, err: 
                `プログラムの内部エラーが発生しました．[手配先パラメータエラー]`});
        }
        const odcd = newargs.split(":")[0];

        // 全社員マスタの存在チェック(EMの担当者マスタではないので注意すること)
        if (await mysqlHandler.isKM0010(operator) == false) {
            const logger = log4js.getLogger("e");
            logger.error("社員マスタに存在しない:" + operator);
            logger.error(`/ireporegist/${userid}/${args}/${bads}/${scraps}/${others}`);
            // メールで飛ばす（iRepoには登録されてしまっている為、手動で削除しないといけない）
            const MAIL_SUBJECT = "[自動通知] 社員マスタに存在しない";
            const MAIL_BODY_HEADER = `各位\n\n作業日報入力で社員マスタに存在しない可能性が発生しました:[${operator}]\n\n error.log を確認してください\n\n`;
            sendMail(MAIL_SUBJECT, MAIL_BODY_HEADER);
            return res.render("index.ejs", {req, planday, err: "社員マスタに存在しません．システム担当者に連絡してください．"});
        // 商品マスタの存在チェック
        } else if (await mysqlHandler.isM0500(hmcd) == false) {
            const logger = log4js.getLogger("e");
            logger.error("品目マスタに存在しない:" + hmcd);
            logger.error(`/ireporegist/${userid}/${args}/${bads}/${scraps}/${others}`);
            // メールで飛ばす（iRepoには登録されてしまっている為、手動で削除しないといけない）
            const MAIL_SUBJECT = "[自動通知] 品目マスタに存在しない";
            const MAIL_BODY_HEADER = `各位\n\n作業日報入力で品目マスタに存在しない可能性が発生しました:[${hmcd}]\n\n error.log を確認してください\n\n`;
            sendMail(MAIL_SUBJECT, MAIL_BODY_HEADER);
            return res.render("index.ejs", {req, planday, err: "品目マスタに存在しません．"});
        // 現場担当者が入力したかどうか分からなくなってしまい２回入力する事があるためチェックしてはじく
        } else if (await mysqlHandler.isDuplicateKD8220(userid, args, bads, scraps, others)) {
            const logger = log4js.getLogger("e");
            logger.error(`登録データに重複の可能性あり:${hmcd}(${operator})`);
            logger.error(`/ireporegist/${userid}/${args}/${bads}/${scraps}/${others}`);
            // メールで飛ばす（iRepoには登録されてしまっている為、手動で削除しないといけない）
            const MAIL_SUBJECT = "[自動通知] 重複の可能性";
            const MAIL_BODY_HEADER = `各位\n\n作業日報入力で重複の可能性が発生しました:[${hmcd}]\n\n error.log を確認してください\n\n`;
            sendMail(MAIL_SUBJECT, MAIL_BODY_HEADER);
            return res.render("index.ejs", {req, planday, err: 
                "登録データが重複しています！1分後に再度実行してください．このブラウザは閉じてください．"});
        // 入力場所の工程コードと品目手順の工程コードが相違の場合
        } else if (ktflg == false) {
            const logger = log4js.getLogger("e");
            logger.error("工程コードと入力場所の不一致:" + hmcd);
            logger.error(`/ireporegist/${userid}/${args}/${bads}/${scraps}/${others}`);
            // メールで飛ばす（iRepoには登録されてしまっている為、手動で削除しないといけない）
            const MAIL_SUBJECT = "[自動通知] 工程コードと入力場所の不一致";
            const MAIL_BODY_HEADER = `各位\n\n工程コードと入力場所が不一致です:[${hmcd}]\n\n iRepo自動帳票を削除してください．\n\n`;
            sendMail(MAIL_SUBJECT, MAIL_BODY_HEADER);
            return res.render("index.ejs", {req, planday, err: 
                `[${hmcd}] 工程コードと入力場所が不一致です．品番を確認の上Xボタンを押してください．`});
        // 実績計上あり工程の判定
        } else if ((odcd.substring(0, 4) == "6070" || 
                    odcd.substring(0, 4) == "6071" && jiflg != true && es01jiflg != true)) {
            const logger = log4js.getLogger("e");
            logger.error("実績計上が不要な品番です:" + hmcd);
            logger.error(`/ireporegist/${userid}/${args}/${bads}/${scraps}/${others}`);
            // メールで飛ばす（iRepoには登録されてしまっている為、手動で削除しないといけない）
            const MAIL_SUBJECT = "[自動通知] 実績計上不要品番の入力";
            const MAIL_BODY_HEADER = `各位\n\n実績計上が不要な品番が入力されました:[${hmcd}]\n\n iRepo自動帳票を削除してください．\n\n`;
            sendMail(MAIL_SUBJECT, MAIL_BODY_HEADER);
            return res.render("index.ejs", {req, planday, err: 
                `[${hmcd}] 間違った品番が入力されました [実績計上が不要な品番]．品番を確認の上ブラウザを閉じてください．`});
        // 実績計上なし工程の判定
        } else if ((odcd.substring(0, 4) == "6050" || odcd.substring(0, 4) == "6072") && jiflg != false) {
            const logger = log4js.getLogger("e");
            logger.error("実績計上が必要な品番です:" + hmcd);
            logger.error(`/ireporegist/${userid}/${args}/${bads}/${scraps}/${others}`);
            // メールで飛ばす（iRepoには登録されてしまっている為、手動で削除しないといけない）
            const MAIL_SUBJECT = "[自動通知] 実績計上必要品番の入力";
            const MAIL_BODY_HEADER = `各位\n\n実績計上が必要な品番が入力されました:[${hmcd}]\n\n iRepo自動帳票を削除してください．\n\n`;
            sendMail(MAIL_SUBJECT, MAIL_BODY_HEADER);
            return res.render("index.ejs", {req, planday, err: 
                `[${hmcd}] 間違った品番が入力されました [実績計上が必要な品番]．確認の上ブラウザを閉じてください．`});
        }

        // 洩れ検査日報登録
        await mysqlHandler.insertKD8220(userid, newargs, bads, scraps, others);

        // 洩れ検査日報TopPageに画面遷移
        res.redirect(`/es/plan/${planday}/${odcd}/1`);

    } catch (err) {
        next(err);
    }
});

// 洩れ検査TopPage (es-index)
app.get("/es", async (req, res, next) => {
    const d = new Date();
    const planday = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    const odcd = "60707"; // 手配先コード指定なしの場合のデフォルト値
    res.redirect(`/es/plan/${planday}/${odcd}/1`);
});

// 洩れ検査SecondPage (es-index)
app.get("/es/:odcd", async (req, res, next) => {
    const d = new Date();
    const planday = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    const odcd = req.params.odcd;
    res.redirect(`/es/plan/${planday}/${odcd}/1`);
});

// 日別 洩れ検査日報 (es-index) [disp=1:No(Asc)2:No(Desc)3:HMCD(Asc)4:HMCD(Desc)5:Operator(Asc)6:Operator(Desc)]
app.get("/es/plan/:planday/:odcd/:disp", async (req, res, next) => {
    const planday = req.params.planday;
    const odcd = req.params.odcd;
    const odgcd = odcd.substring(0, 4) + "0";
    const disp = req.params.disp;
    req.session.nextaddr = `/es/plan/${planday}/${odcd}/${disp}`;
    if (!loginCheck(req, res)) return;
    try {
        // 一覧表示
        const ymds = await mysqlHandler.getESYMDs();
        const kd8220 = await mysqlHandler.getKD8220(planday, odcd, disp);
        const kd8220csv =  await mysqlHandler.getKD8220csv(planday, odcd);
        res.render("index.ejs", {req, ymds, planday, odcd, odgcd, kd8220, kd8220csv, disp});
    } catch (err) {
        next(err);
    }
});

// iPhone専用Page (リーダー用)
// entryplace = wl01:黄銅, wl04:炉中
app.get("/i/:entryplace", async (req, res, next) => {
    const d = new Date();
    const planday = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    try {
        // 一覧表示
        const entryplace = req.params.entryplace.toUpperCase();
        const ymds = await mysqlHandler.getESYMDs();
        const kd8220 = await mysqlHandler.getKD8220iPhone(planday, entryplace);
        res.render("iphone.ejs", {req, ymds, planday, kd8220});
    } catch (err) {
        next(err);
    }
});

// リストの消込処理 DB更新 ⇒ ステータス返却 API
app.get("/es/marking/:autono/:sts", async function (req, res, next) {
    const userid = req.session.userid;
    const autono = req.params.autono;
    const sts = req.params.sts;
    try {
        await mysqlHandler.updateKD8220status(userid, autono, sts);
        res.status(200).end();
    } catch (err) {
        next(err);
    }
});

// CSVファイル作成 [es_YYYY-MM-DD.csv] ⇒ DB更新 ⇒ ステータス返却 API
// odcd
app.get("/es/makecsv/:planday/:odcd/:downloadday/:time", async function (req, res, next) {
    const planday = req.params.planday;
    const odcd = req.params.odcd;
    const downloadday = req.params.downloadday;
    const time = req.params.time;
    const csvfilename = `es_${downloadday}_${odcd}_${time}.csv`;
    const csvfilepath = `${__dirname}/public/downloads/${csvfilename}`;
    try {
        const kd8220csv = await mysqlHandler.getKD8220csv(planday, odcd);
        csvwrite(kd8220csv, csvfilepath); // サーバー上にCSVファイル作成
        const userid = req.session.userid;
        await mysqlHandler.updateKD8220downloaded(userid, planday, odcd);
        res.status(200).end();
    } catch (err) {
        next(err);
    }
});

// 明細削除処理
app.get("/es/delete/:planday/:odcd/:autono", async (req, res, next) => {
    const planday = req.params.planday;
    const odcd = req.params.odcd;
    const autono = parseInt(req.params.autono);
    try {
        // 削除対象の明細データを取得
        const kd8220autono = await mysqlHandler.getKD8220autono(autono);

        // 明細削除
        const result = await mysqlHandler.deleteKD8220(autono);
        if (result.affectedRows != 1) {
            const logger = log4js.getLogger("e");
            logger.error("レコードの削除に失敗しました:" + autono);
            logger.error(`/es/delete/${planday}/${odcd}/${autono}`);
            return res.render("index.ejs", {req, planday, err: "レコードの削除に失敗しました．"});
        }

        //　明細削除内容をデバッグログに出力
        const logger = log4js.getLogger();
        logger.debug(`/es/delete/${planday}/${odcd}/${autono}`);

        // 削除した旨のメッセージをメール送信
        const MAIL_SUBJECT = "[自動通知] 作業日報削除依頼"; // メールタイトル        
        const MAIL_BODY_HEADER = "各位\n\n作業日報入力データが削除されました\n" + 
            "主キー：" + kd8220autono[0].AUTONO + "\n" + 
            "品番　：" + kd8220autono[0].HMCD + "\n" + 
            "入庫数：" + kd8220autono[0].CHKQTY + "\n" + 
            "出庫数：" + kd8220autono[0].DEPOQTY + "\n\n"; // メール本文
        sendMail(MAIL_SUBJECT, MAIL_BODY_HEADER);

        res.redirect(`/es/plan/${planday}/${odcd}/1`);

    } catch (err) {
        const logger = log4js.getLogger("e");
        logger.error("明細の削除処理関連で失敗が発生しました\n明細No:" + autono);
        logger.error(`/es/delete/${planday}/${odcd}/${autono}`);
        next(err);
    }
});

// 洩れ検査日報データ検索画面
app.get("/essearch", async function (req, res, next) {
    try {
        const kd8220dic = await mysqlHandler.getKD8220dic();
        res.render("search.ejs", {req, kd8220dic});
    } catch (err) {
        next(err);
    }
});

// 洩れ検査日報データ取得 API
app.get("/es/search/:hmcd", async function (req, res, next) {
    try {
        const hmcd = req.params.hmcd;
        const kd8220hmcd = await mysqlHandler.getKD8220hmcd(hmcd);
        res.status(200).json(kd8220hmcd);
    } catch (err) {
        next(err);
    }
});

// 包括的エラーハンドリング
app.use((err, req, res, next) => {
    console.log("包括的エラーハンドリング")
    console.error(err);
    res.status(500).send(`サーバーの動作が失敗しました．:${err.code} `);
});

// データベース接続した後にサーバーを起動
mysqlHandler.connect
.then(() => {
    console.log(`MySQL Database [${mysqlHandler.database}] Connected!`);
    server.listen(PORT, () => {console.log(`Koken APP listen on Port:${PORT}`)});
}).catch((err) => {
    console.log("MySQL Database Connection Error!");
    console.log(err);
});
