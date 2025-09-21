const mysql = require('mysql2/promise');
const { mysqlConfig } = require('../config.js');

// MySQL接続情報
const connectionString = {
      host: mysqlConfig.HOST
    , port: mysqlConfig.PORT
    , database: mysqlConfig.DATABASE
    , user: mysqlConfig.USER
    , password: mysqlConfig.PASSWORD
    , dateStrings: 'date' /*または'true'*/
};
exports.database = connectionString.database;

// コネクションプールの取得
const pool = mysql.createPool(connectionString);
const connect = pool.getConnection()
exports.connect = connect;


// Database から データを取得する
const getDatabase = async (sql, param) => {
    const conn = await pool.getConnection();
    const results = await conn.query(sql, param);
    conn.release();
    return JSON.parse(JSON.stringify(results[0]));;
};

// ユーザー情報の取得
const getM0010 = async (userid) => {
    const sql = "select TANNM, PASSWD from m0010 where TANCD=?"
    return getDatabase(sql, [userid]);
};
exports.getM0010 = getM0010;

// 炉中洩れ検査日報登録
exports.insertKD8220 = async (id, args, bads, scraps, others) => {
    // parseInt():必須項目にはこれ（速そう）
    const odcd = args.split(":")[0];
    const hmcd = args.split(":")[1].trim(); // サトーラベルプリンタ対応 23.09.07 y.w trim()
    const chkqty = parseInt(args.split(":")[2]);
    const depoqty = parseInt(args.split(":")[3]);
    const operator = args.split(":")[4];
    // Number():nullを0に変換してくれる（遅そう）
    const leakbrass = Number(bads.split(":")[0]);
    const leaktig = Number(bads.split(":")[1]);
    const leakcopper = Number(bads.split(":")[2]);
    const leakarc = Number(bads.split(":")[3]);
    const defectshape = Number(bads.split(":")[4]);
    const defectother = Number(bads.split(":")[5]);
    const scrapbrass = Number(scraps.split(":")[0]);
    const scraptig = Number(scraps.split(":")[1]);
    const scrapcopper = Number(scraps.split(":")[2]);
    const scraparc = Number(scraps.split(":")[3]);
    const scrapshape = Number(scraps.split(":")[4]);
    const scrapother = Number(scraps.split(":")[5]);
    const repair = others.split(":")[1] == '' ? null : others.split(":")[1];
    const verifire = others.split(":")[2] == '' ? null : others.split(":")[2];
    const entrykbn = others.split(":")[3]; // 1:QR品番 2:三枚複写 3:試作品番
    let note = "";
    if (entrykbn == "3") {
        note = "試作" + others.split(":")[0];
    } else {
        note = others.split(":")[0]; // 備考
    }
    const insert = await getDatabase(
        "insert into kd8220 (" + 
            "ENTRYDT, ENTRYKBN, ODCD, TKCD, HMCD, " + 
            "CHKQTY, DEPOQTY, DEPTCD, OPERATOR, " + 
            "LEAKBRASS, LEAKTIG, LEAKCOPPER, LEAKARC, DEFECTSHAPE, DEFECTOTHER, "+ 
            "SCRAPBRASS, SCRAPTIG, SCRAPCOPPER, SCRAPARC, SCRAPSHAPE, SCRAPOTHER, " + 
            "NOTE, REPAIR, VERIFIRE, INSTID, UPDTID" + 
        ") select curdate(), ?, ?, b.TKCD, ?, " + 
            "?, ?, a.DEPTCD, ?, " + 
            "?, ?, ?, ?, ?, ?, " + 
            "?, ?, ?, ?, ?, ?, " + 
            "?, ?, ?, ?, ? " + 
        "from km0010 a left outer join m0500 b on b.HMCD=? where a.EMPNO=?" 
        , [ entrykbn, odcd, hmcd, 
            chkqty, depoqty, operator, 
            leakbrass, leaktig, leakcopper, leakarc, defectshape, defectother, 
            scrapbrass, scraptig, scrapcopper, scraparc, scrapshape, scrapother, 
            note, repair, verifire, id, id, hmcd, operator ]
    );
};

// 炉中洩れ検査日報 ２重登録のチェック
// 1分以内に同一データの登録があるかをチェックする
exports.isDuplicateKD8220 = async (id, args, bads, scraps, others) => {
    // parseInt():必須項目にはこれ（速そう）
    const odcd = args.split(":")[0];
    const hmcd = args.split(":")[1];
    const chkqty = parseInt(args.split(":")[2]);
    const depoqty = parseInt(args.split(":")[3]);
    const operator = args.split(":")[4];
    // Number():nullを0に変換してくれる（遅そう）
    const leakbrass = Number(bads.split(":")[0]);
    const leaktig = Number(bads.split(":")[1]);
    const leakcopper = Number(bads.split(":")[2]);
    const leakarc = Number(bads.split(":")[3]);
    const defectshape = Number(bads.split(":")[4]);
    const defectother = Number(bads.split(":")[5]);
    const scrapbrass = Number(scraps.split(":")[0]);
    const scraptig = Number(scraps.split(":")[1]);
    const scrapcopper = Number(scraps.split(":")[2]);
    const scraparc = Number(scraps.split(":")[3]);
    const scrapshape = Number(scraps.split(":")[4]);
    const scrapother = Number(scraps.split(":")[5]);
    const kd8220autono = await getDatabase(
        "select autono from kd8220 where " + 
            "ENTRYDT=curdate() and ODCD=? and HMCD=? and " + 
            "CHKQTY=? and DEPOQTY=? and OPERATOR=? and " + 
            "LEAKBRASS=? and LEAKTIG=? and LEAKCOPPER=? and LEAKARC=? and DEFECTSHAPE=? and DEFECTOTHER=? and "+ 
            "SCRAPBRASS=? and SCRAPTIG=? and SCRAPCOPPER=? and SCRAPARC=? and SCRAPSHAPE=? and SCRAPOTHER=? and " + 
            "INSTID=? and UPDTID=? and instdt > CURRENT_TIMESTAMP() - INTERVAL 1 MINUTE"
        , [ odcd, hmcd, 
            chkqty, depoqty, operator, 
            leakbrass, leaktig, leakcopper, leakarc, defectshape, defectother, 
            scrapbrass, scraptig, scrapcopper, scraparc, scrapshape, scrapother, 
            id, id ]
    );
    return kd8220autono.length == 0 ? false : true;
};

// 炉中洩れ検査日報取得
exports.getKD8220 = async (date, odcd, disp) => {
    const odcdlike = odcd + "%";
    let orderby = "";
    switch(disp){
        case "1":
            orderby = "order by a.INSTDT asc";
            break;
        case "2":
            orderby = "order by a.INSTDT desc";
            break;
        case "3":
            orderby = "order by a.HMCD asc";
            break;
        case "4":
            orderby = "order by a.HMCD desc";
            break;
        case "5":
            orderby = "order by a.OPERATOR asc";
            break;
        case "6":
            orderby = "order by a.OPERATOR desc";
            break;                         
    }
    const kd8220 = await getDatabase(
        "select a.*, ifnull(b.TKRNM, '-') as 'TKRNM', c.NAME as 'OPNAME' " + 
        ", ifnull(r.NAME, '') as 'RNAME'" + 
        ", ifnull(v.NAME, '') as 'VNAME'" + 
        "from kd8220 a " +
        "left outer join m0200  b on a.TKCD=b.TKCD " + 
        "left outer join km0010 r on a.REPAIR=r.EMPNO " +
        "left outer join km0010 v on a.VERIFIRE=v.EMPNO, km0010 c " +
        "where a.OPERATOR=c.EMPNO and ENTRYDT=? and ODCD like ? " + orderby
        , [date, odcdlike]
    );
    return kd8220;
};

// iPhone表示用の日報データ取得
exports.getKD8220iPhone = async (date, entryplace) => {
    let odcd = "";
    if (entryplace == "WL04") {
        odcd = "607%";
    } else if (entryplace == "WL01") {
        odcd = "605%";
    }
    const kd8220 = await getDatabase(
        "select a.*, ifnull(b.TKRNM, '-') as 'TKRNM', NAME as 'OPNAME' " + 
        "from kd8220 a left outer join m0200 b on a.TKCD=b.TKCD, km0010 c " +
        "where a.ODCD like '" + odcd + "' and a.OPERATOR=c.EMPNO and ENTRYDT=? order by a.HMCD"
        , [date]
    );
    return kd8220;
};

// 炉中洩れ検査日報CSV用データ取得
exports.getKD8220csv = async (date, odcd) => {
    const odcdlike = odcd + "%";
    const kd8220csv = await getDatabase(
        "select " + 
        "ROW_NUMBER() OVER (ORDER BY AUTONO ASC) AS 'NO'," + 
        "a.ODCD as '手配先コード'," + 
//        "a.ENTRYSTS as '入力ステータス'," + 
//        "a.TKCD as '得意先コード'," + 
        "ifnull(b.TKRNM, '-') as '得意先'," + 
        "a.HMCD as '品番'," + 
        "a.CHKQTY as '入庫数'," + 
        "a.DEPOQTY as '出庫数'," + 
        "a.SCRAPBRASS+a.SCRAPTIG+a.SCRAPCOPPER+a.SCRAPARC+a.SCRAPSHAPE+a.SCRAPOTHER as '廃棄数'," +
        "a.LEAKBRASS as '黄銅部'," + 
        "a.LEAKTIG as '仮付け部'," + 
        "a.LEAKCOPPER as '炉中部'," + 
        "a.LEAKARC as '電気溶接部'," + 
        "a.DEFECTSHAPE as '形状不良'," + 
        "a.DEFECTOTHER as 'その他'," + 
//        "a.DEPTCD as '部門コード'," + 
        "a.OPERATOR as '作業者コード'," + 
        "c.NAME as '作業者名'," + 
        "a.NOTE as '備考'," + 
        "a.SCRAPBRASS as '黄銅部廃棄数'," + 
        "a.SCRAPTIG as '仮付け部廃棄数'," + 
        "a.SCRAPCOPPER as '炉中部廃棄数'," + 
        "a.SCRAPARC as '電気溶接部廃棄数'," + 
        "a.SCRAPSHAPE as '形状不良廃棄数'," + 
        "a.SCRAPOTHER as 'その他廃棄数'," + 

        "case a.ODCD " + 
        "when '6070'  then '炉中洩検' " + 
        "when '60707' then '炉中洩検(1階)' " + 
        "when '60708' then '炉中洩検(2階)' " + 
        "when '6071'  then '炉中メッキ他' " + 
        "when '60717' then '炉中メッキ他(1階)' " + 
        "when '60718' then '炉中メッキ他(2階)' " + 
        "when '6072'  then '炉中出口' " + 
        "when '60727' then '炉中出口(1階)' " + 
        "when '60728' then '炉中出口(2階)' " + 
        "when '6050'  then '黄銅洩検' " + 
        "when '60500' then '黄銅洩検' " + 
        "when '6020'  then '電気洩検' " + 
        "when '60200' then '電気洩検' " + 
        "else 'nothing'	end as '手配先名称1', " + 

        "a.INSTID as '登録者'," + 
        "a.INSTDT as '登録日時' " + 
        "from kd8220 a left outer join m0200 b on a.TKCD=b.TKCD, km0010 c " + 
        "where a.OPERATOR=c.EMPNO " + 
        "and a.CSVOUTDT is null and a.ENTRYDT=? and a.ODCD like ?"
        , [date, odcdlike]
    );
    return kd8220csv;
};

// 炉中洩れ検査日報検索画面セレクトボックス用データ取得
exports.getKD8220dic = async () => {
    const kd8220dic = await getDatabase(
        "select HMCD from kd8220 group by HMCD order by HMCD"
    );
    return kd8220dic;
};

// 炉中洩れ検査日報検索APIデータ取得(並び替え後100件まで)
exports.getKD8220hmcd = async (hmcd) => {
    const kd8220hmcd = await getDatabase(
        "select a.*, ifnull(b.TKRNM, '-') as 'TKRNM', c.NAME as 'OPNAME' " + 
        ", ifnull(d.NAME, '') as 'REPAIRNAME' " + 
        ", ifnull(e.NAME, '') as 'VERIFIRENAME' " + 
        "from kd8220 a " + 
            "left outer join m0200 b on b.TKCD=a.TKCD " +
            "left outer join km0010 d on d.EMPNO=a.REPAIR " +
            "left outer join km0010 e on e.EMPNO=a.VERIFIRE " +
        ", km0010 c " + 
        "where a.OPERATOR=c.EMPNO and a.HMCD=? " + 
        "order by a.AUTONO desc " + 
        "limit 100"
        , [hmcd]
    );
    return kd8220hmcd;
};

// 炉中洩れ検査日報検索APIデータ取得(日付指定)(並び替え後100件まで)
exports.getKD8220hmcdinstdt = async (hmcd, stdate, eddate) => {
    const eddatetime = eddate + " 23:59:59";
    const kd8220hmcd = await getDatabase(
        "select a.*, ifnull(b.TKRNM, '-') as 'TKRNM', c.NAME as 'OPNAME' " + 
        ", ifnull(d.NAME, '') as 'REPAIRNAME' " + 
        ", ifnull(e.NAME, '') as 'VERIFIRENAME' " + 
        "from kd8220 a " + 
            "left outer join m0200 b on b.TKCD=a.TKCD " +
            "left outer join km0010 d on d.EMPNO=a.REPAIR " +
            "left outer join km0010 e on e.EMPNO=a.VERIFIRE " +
        ", km0010 c " + 
        "where a.OPERATOR=c.EMPNO and a.HMCD=? " + 
        "and a.INSTDT between ? and ? " + 
        "order by a.AUTONO desc " + 
        "limit 100"
        , [hmcd, stdate, eddatetime]
    );
    return kd8220hmcd;
};

// 炉中洩れ検査日報ステータス更新
exports.updateKD8220status = async (userid, autono, sts) => {
    const update = await getDatabase(
        "update kd8220 set ENTRYSTS=?, UPDTID=? where AUTONO=?"
        , [sts, userid, autono]
    );
};

// 炉中洩れ検査日報レコード削除前のデータ取得
exports.getKD8220autono = async (autono) => {
    const kd8220autono = await getDatabase(
        "select * from kd8220 where AUTONO=?"
        , [autono]
    );
    return kd8220autono;
};

// 炉中洩れ検査日報レコード削除
exports.deleteKD8220 = async (autono) => {
    const result = await getDatabase(
        "delete from kd8220 WHERE AUTONO=?"
        , [autono]
    );
    return result;
};

// CSVダウンロード済に更新
exports.updateKD8220downloaded = async (userid, planday, odcd) => {
    const odcdlike = odcd + "%";
    const update = await getDatabase(
        "update kd8220 set CSVOUTDT=current_timestamp, UPDTID=? where ENTRYDT=? and ODCD like ? and CSVOUTDT is null"
        , [userid, planday, odcdlike]
    );
};

// ２週間前から明日までのすべての日付を取得
const getESYMDs = async () => {
    const sql = 
        "select DATE_FORMAT(YMD,'%Y-%m-%d') 'YMD' from s0820 where CALTYP='00001' and YMD between " +
        "(CURRENT_DATE - interval 14 day) " + 
        "and " + 
        "(CURRENT_DATE + interval 1 day)"
    const ymdobj = await getDatabase(sql, []);
    const ymd = [];
    for (let row of ymdobj) {ymd.push(row.YMD)};
    return ymd;
};
exports.getESYMDs = getESYMDs;

// 従業員マスタ(KM0010)存在チェック
exports.isKM0010 = async (userid) => {
    const km0010 = await getDatabase("select * from km0010 where EMPNO=?", [userid]);
    return km0010.length == 0 ? false : true;
};

// 品目マスタ(M0500)存在チェック
exports.isM0500 = async (hmcd) => {
    const m0500 = await getDatabase("select * from m0500 where HMCD=?", [hmcd]);
    return m0500.length == 0 ? false : true;
};

// 炉中洩れ検査日報 実績区分チェック
exports.isM0510JIKBN = async (hmcd, ktcd) => {
    const sql = "select * from m0510 a where a.HMCD=? and a.KTCD=? and a.JIKBN='1' and a.VALDTF=" +
        "(select MAX(tmp.VALDTF) from M0510 tmp where tmp.HMCD=a.HMCD)";
    const m0510 = await getDatabase(sql, [hmcd, ktcd]);
    return m0510.length == 0 ? false : true;
};

// 入力場所の工程コードチェック
exports.isM0510KTCD = async (hmcd, ktcd) => {
    // const ktcdlike = ktcd + "%";
    const sql = "select * from m0510 a where a.HMCD=? and a.KTCD=? and a.VALDTF=" +
        "(select MAX(tmp.VALDTF) from M0510 tmp where tmp.HMCD=a.HMCD)";
    const m0510 = await getDatabase(sql, [hmcd, ktcd]);
    return m0510.length == 0 ? false : true;
};
