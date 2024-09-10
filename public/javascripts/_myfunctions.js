// JavascriptでOS（Windows・Linux・Mac・iPad・iPhone）を判定
function myOS() {
    var ua = window.navigator.userAgent.toLowerCase();
    if (ua.match("windows") !== null) { return "windows"; } else 
    if (ua.match("linux") !== null) { return "linux"; } else 
    if (ua.match("mac") !== null) { return "mac"; } else 
    if (ua.match("ipad") !== null) { return "ipad"; } else 
    if (ua.match("iphone") !== null) { return "iphone"; } else { return "nothing"; }
}
// Javascriptでブラウザ（Chrome・IE・Edge・FireFox・Safari）を判定
function myBrowser() {
    var browser = window.navigator.userAgent.toLowerCase();
    if (browser.match("chrome") !== null) { return "chrome"; } else 
    if (browser.match("firefox") !== null) { return "firefox"; } else 
    if (browser.match("safari") !== null) { return "safari"; } else 
    if (browser.match("edge") !== null) { return "edge"; } else 
    if (browser.match("ie") !== null) { return "ie"; } else 
    if (browser.match("opera") !== null) { return "opera"; } else { return ""; }
}
// 入力場所コード（odcd）の名前を返却
function getEntryName(odcd) {
    if (odcd == "60707") return "炉中洩検(1階)";
    if (odcd == "60708") return "炉中洩検(2階)";
    if (odcd == "60500") return "黄銅洩検";
    if (odcd == "60717") return "炉中メッキ他(1階)";
    if (odcd == "60718") return "炉中メッキ他(2階)";
    if (odcd == "60727") return "炉中目視(1階)";
    if (odcd == "60728") return "炉中目視(2階)";
    if (odcd == "6070") return "炉中洩検";
    if (odcd == "6050") return "黄銅洩検";
    if (odcd == "6071") return "炉中メッキ他";
    if (odcd == "6072") return "炉中目視";
    return "-";
}
// 入力場所コード（odcd）の略称を返却
function getEntryRNM(odcd) {
    if (odcd == "60707") return "炉洩1F";
    if (odcd == "60708") return "炉洩2F";
    if (odcd == "60500") return "黄銅洩";
    if (odcd == "60717") return "ﾒｯｷ他1F";
    if (odcd == "60718") return "ﾒｯｷ他2F";
    if (odcd == "60727") return "目視1F";
    if (odcd == "60728") return "目視2F";
    if (odcd == "6070") return "炉中洩";
    if (odcd == "6050") return "黄銅洩";
    if (odcd == "6071") return "ﾒｯｷ他";
    if (odcd == "6072") return "目視";
    return "-";
}
