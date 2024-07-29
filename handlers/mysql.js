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

// 今週月曜日から来週金曜日までの営業日を取得
const getYMDs = async () => {
    const sql = 
        "select YMD from (select DATE_FORMAT(YMD,'%Y-%m-%d') 'YMD' from s0820 where CALTYP='00001' and WKKBN='1' and YMD between " +
        "(CURRENT_DATE - interval WEEKDAY(CURRENT_DATE) day) " + 
        "and " + 
        "(CURRENT_DATE - interval WEEKDAY(CURRENT_DATE) day + interval 30 day)) T limit 10"
    const ymdobj = await getDatabase(sql, []);
    const ymd = [];
    for (let row of ymdobj) {ymd.push(row.YMD)};
    return ymd;
};
exports.getYMDs = getYMDs;

// 設備グループ群の取得
const getMCGCDs = async () => {
    const sql = "select MCGSEQ, MCGCD from km8420 group by MCGSEQ, MCGCD";
    return getDatabase(sql, []);
};
exports.getMCGCDs = getMCGCDs;

// 設備群の取得
const getMCCDs = async (mcgcd) => {
    const sql = 
        "select MCCD, MCNM from km8420 where MCGCD=? and FLG1='1' order by MCSEQ asc";
    return getDatabase(sql, [mcgcd]);
};
exports.getMCCDs = getMCCDs;

// 設備マスタ展開 KT1～KT6を展開
const getKM8430 = async (mcgcd) => {
    const sql = "select * from km8430 where KTKEY like ?";
    const km8430 = await getDatabase(sql, [`%${mcgcd}-%:%`])
    const results = [];
    for (let row of km8430) {
        // 工程数分ループし横→縦変換
        for(let i = 1; i <= row.KTSU; i++) {
            results.push({
                HMCD: row.HMCD, MCGCD: row[`KT${i}MCGCD`], MCCD: row[`KT${i}MCCD`], 
                CT: row[`KT${i}CT`], DT: row[`KT${i}DT`], KTSU: row.KTSU, KTKEY: row.KTKEY
            });
        }
    }
    return results;
};
exports.getKM8430 = getKM8430;

// 手配データを並べて表示する際の設備ごとに決まっている仕様
const getMCOrderby = (mcgcd) => {
    const orderby = {
        SW: "order by b.MATESIZE desc, a.HMCD ",
        SS: "order by a.HMCD ",
        XT: "order by a.HMCD ",
        CN: "order by b.MATESIZE, a.HMCD ",
        MS: "order by b.MATESIZE, a.HMCD ",
        LA: "",
        NC: "order by a.HMCD ",
        ON: "order by a.HMCD ",
        ON3:"order by a.HMCD ",
        MD: "order by a.HMCD ",
        D:  "order by a.HMCD ",
        MC: "order by a.HMCD ",
        G:  "order by a.HMCD ",
        TP: "order by a.HMCD ",
        SK: "order by a.HMCD ",
        LF: "order by a.HMCD ",
        TN: "order by a.HMCD "
    };
    return orderby[mcgcd];
};
exports.getMCOrderby = getMCOrderby;

// 設備毎の注文データを2週間分取得
const getD0415weeks = async (mcgcd, mccds, ymds) => {
    const orderby = getMCOrderby(mcgcd);
    const mc = [];
    for (let mccd of mccds) {
        let parameters = [...ymds, ...ymds, ...ymds, mcgcd, mccd.MCCD, ymds[0], ymds[9],
                "%" + mcgcd + "-" + mccd.MCCD + ":%", ...ymds];
        let sql = "select a.HMCD, b.HMNM, b.MATESIZE" +
        ",sum(case when EDDT=? then ODRQTY else null end) as 'D0'" +
        ",sum(case when EDDT=? then ODRQTY else null end) as 'D1'" +
        ",sum(case when EDDT=? then ODRQTY else null end) as 'D2'" +
        ",sum(case when EDDT=? then ODRQTY else null end) as 'D3'" +
        ",sum(case when EDDT=? then ODRQTY else null end) as 'D4'" +
        ",sum(case when EDDT=? then ODRQTY else null end) as 'D5'" +
        ",sum(case when EDDT=? then ODRQTY else null end) as 'D6'" +
        ",sum(case when EDDT=? then ODRQTY else null end) as 'D7'" +
        ",sum(case when EDDT=? then ODRQTY else null end) as 'D8'" +
        ",sum(case when EDDT=? then ODRQTY else null end) as 'D9'" +
        ",sum(case when EDDT=? and ODRSTS in ('2','3') then ODRQTY else null end) as 'D0Z'" +
        ",sum(case when EDDT=? and ODRSTS in ('2','3') then ODRQTY else null end) as 'D1Z'" +
        ",sum(case when EDDT=? and ODRSTS in ('2','3') then ODRQTY else null end) as 'D2Z'" +
        ",sum(case when EDDT=? and ODRSTS in ('2','3') then ODRQTY else null end) as 'D3Z'" +
        ",sum(case when EDDT=? and ODRSTS in ('2','3') then ODRQTY else null end) as 'D4Z'" +
        ",sum(case when EDDT=? and ODRSTS in ('2','3') then ODRQTY else null end) as 'D5Z'" +
        ",sum(case when EDDT=? and ODRSTS in ('2','3') then ODRQTY else null end) as 'D6Z'" +
        ",sum(case when EDDT=? and ODRSTS in ('2','3') then ODRQTY else null end) as 'D7Z'" +
        ",sum(case when EDDT=? and ODRSTS in ('2','3') then ODRQTY else null end) as 'D8Z'" +
        ",sum(case when EDDT=? and ODRSTS in ('2','3') then ODRQTY else null end) as 'D9Z'" +
        ",min(case when EDDT=? then ODRSTS else null end) as 'STS0'" +
        ",min(case when EDDT=? then ODRSTS else null end) as 'STS1'" +
        ",min(case when EDDT=? then ODRSTS else null end) as 'STS2'" +
        ",min(case when EDDT=? then ODRSTS else null end) as 'STS3'" +
        ",min(case when EDDT=? then ODRSTS else null end) as 'STS4'" +
        ",min(case when EDDT=? then ODRSTS else null end) as 'STS5'" +
        ",min(case when EDDT=? then ODRSTS else null end) as 'STS6'" +
        ",min(case when EDDT=? then ODRSTS else null end) as 'STS7'" +
        ",min(case when EDDT=? then ODRSTS else null end) as 'STS8'" +
        ",min(case when EDDT=? then ODRSTS else null end) as 'STS9' " +
        "from d0415 a, km8430 b where a.HMCD = b.HMCD and b.ACTIVE='1'" +
        " and a.KTCD like 'MP%' and a.ODCD like '6060%'" +
        " and a.MCGCD=? and a.MCCD=? and a.EDDT between ? and ?" +
        " and a.HMCD in (select hmcd from km8430 where ktkey like ? and active='1') " +
        "group by a.HMCD, b.HMNM, b.MATESIZE " + 
        "having " +
        " sum(case when EDDT<=? then ODRQTY else null end) > 0 or" +
        " sum(case when EDDT=? then ODRQTY else null end) > 0 or" +
        " sum(case when EDDT=? then ODRQTY else null end) > 0 or" +
        " sum(case when EDDT=? then ODRQTY else null end) > 0 or" +
        " sum(case when EDDT=? then ODRQTY else null end) > 0 or" +
        " sum(case when EDDT=? then ODRQTY else null end) > 0 or" +
        " sum(case when EDDT=? then ODRQTY else null end) > 0 or" +
        " sum(case when EDDT=? then ODRQTY else null end) > 0 or" +
        " sum(case when EDDT=? then ODRQTY else null end) > 0 or" +
        " sum(case when EDDT=? then ODRQTY else null end) > 0 " + orderby;
        let d0410 = await getDatabase(sql, parameters);
        mc.push([mccd, d0410]);
    }
    return mc;
};
exports.getD0415weeks = getD0415weeks;

// 設備毎の日別計画票データを取得
const getD0415plan = async (mcgcd, mccds, planday, km8430) => {
    const orderby = getMCOrderby(mcgcd);
    const mc = [];
    for (let mccd of mccds) {
        let mccdstr = mccd.MCCD;
        let d0410 = await getDatabase(
            "select a.ODRNO, a.HMCD, a.ODRQTY, a.JIQTY, a.ODRSTS, a.MCSEQ, a.MCGCD, a.MCCD " + 
            ",time_format(WKDTDT, '%H:%i') as 'DTTM' " +
            ",time_format(WKSTDT, '%H:%i') as 'STTM', time_format(WKEDDT, '%H:%i') as 'EDTM' " +
            "from d0415 a, km8430 b where a.HMCD = b.HMCD" +
            " and a.KTCD like 'MP%' and a.ODCD like '6060%'" +
            " and a.EDDT=? and a.MCGCD=? and a.MCCD=? " + orderby
            , [planday, mcgcd, mccdstr]
        );
        // 注文データにコード票データを付加（CT,DT,工程経路,STS)
        for await (row of d0410) {
            let idx = km8430.findIndex(t => t.HMCD === row.HMCD && t.MCGCD === row.MCGCD && t.MCCD === row.MCCD);
            row.CT = km8430[idx].CT === null ? 0 : km8430[idx].CT;
            row.DT = km8430[idx].DT === null ? 0 : (km8430[idx].DT / 60);
            row.STS1 = row.ODRSTS;
            let sts2 = "";
            let sts3 = "";
            let sts4 = "";
            //　前後工程のオーダー情報を取得
            if (km8430[idx].KTSU > 1) {
                let d0410_sub = await getDatabase(
                "select min(case when MCSEQ=1 then ODRSTS else 'X' end) as 'STS1'" +
                ",min(case when MCSEQ=2 then ODRSTS else 'X' end) as 'STS2'" +
                ",min(case when MCSEQ=3 then ODRSTS else 'X' end) as 'STS3'" +
                ",min(case when MCSEQ=4 then ODRSTS else 'X' end) as 'STS4'" +
                " from d0415 where ODRNO=? group by ODRNO", [row.ODRNO]
                );
                row.STS1 = d0410_sub[0].STS1;
                row.STS2 = d0410_sub[0].STS2;
                row.STS3 = d0410_sub[0].STS3;
                row.STS4 = d0410_sub[0].STS4;
            }
            let ktkeys = (km8430[idx].KTKEY + ":::::").split(":")// 工程を分割
            row.KT1 = getKT(ktkeys[0]);
            row.KT2 = getKT(ktkeys[1]);
            row.KT3 = getKT(ktkeys[2]);
            row.KT4 = getKT(ktkeys[3]);
        };
        mc.push([mccd, d0410]);
    };
    return mc;
};
exports.getD0415plan = getD0415plan;

// グループ名と設備名が同一の場合は片側のみに編集
const getKT = function (str) {
    const kts = str.split("-");
    return kts[0] === kts[1] ? kts[0] : str;
};

// 段取り開始
exports.dandori = async (userid, odrno, planday, mcgcd, mccd) => {
    const update = await getDatabase(
        "update d0415 set ODRSTS='3', UPDTID=?, WKDTDT=current_timestamp " +
        "where ODRNO=? and EDDT=? and MCGCD=? and MCCD=?"
        , [userid, odrno, planday, mcgcd, mccd]
    );    
};

// 作業開始
exports.workstart = async (userid, odrno, planday, mcgcd, mccd) => {
    const update = await getDatabase(
        "update d0415 set ODRSTS='3', UPDTID=?, WKSTDT=current_timestamp " +
        "where ODRNO=? and EDDT=? and MCGCD=? and MCCD=?"
        , [userid, odrno, planday, mcgcd, mccd]
    );
};

// 作業終了
exports.workend = async (jiqty, userid, odrno, planday, mcgcd, mccd) => {
    const update = await getDatabase(
        "update d0415 set JIQTY=?, ODRSTS='4', UPDTID=?, WKEDDT=current_timestamp " +
        "where ODRNO=? and EDDT=? and MCGCD=? and MCCD=?"
        , [jiqty, userid, odrno, planday, mcgcd, mccd]
    );
};

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

// 炉中洩れ検査日報検索APIデータ取得
exports.getKD8220hmcd = async (hmcd) => {
    const kd8220hmcd = await getDatabase(
        "select a.*, ifnull(b.TKRNM, '-') as 'TKRNM', NAME as 'OPNAME' " + 
        "from kd8220 a left outer join m0200 b on a.TKCD=b.TKCD, km0010 c " +
        "where a.OPERATOR=c.EMPNO and a.HMCD=? " + 
        "order by a.AUTONO desc"
        , [hmcd]
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
    const ktcdlike = ktcd + "%";
    const sql = "select * from m0510 a where a.HMCD=? and a.KTCD like ? and a.VALDTF=" +
        "(select MAX(tmp.VALDTF) from M0510 tmp where tmp.HMCD=a.HMCD)";
    const m0510 = await getDatabase(sql, [hmcd, ktcdlike]);
    return m0510.length == 0 ? false : true;
};
