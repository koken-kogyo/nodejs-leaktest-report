@echo off

rem MySQLデータベースのバックアップ処理 2023/12/27 情報システム課 渡辺

rem 各種ファイルとフォルダの設定
set logfile=%~dp0%~n0.log
set targetFile=koken_1.dump
set targetPath=D:\Users\Administrator\Desktop
set backupPath=\\2019backup\Backup\700_その他\760_ポータルサーバ

rem データベース[koken_1]のバックアップ
mysqldump -u root -pKoken4151@ koken_1 > %targetFile%
if not %ERRORLEVEL% == 0 (
    echo データベースのバックアップで異常終了しました。戻り値：%errorlevel% > %logfile%
    goto end
)

rem バックアップファイルの圧縮（PowerShellのコマンドレットを実行）
set psCommand=powershell -NoProfile -ExecutionPolicy Unrestricted Compress-Archive -Path %targetPath%\%targetFile% -DestinationPath %targetPath%\%targetFile%.zip -Force
%psCommand%
if not %ERRORLEVEL% == 0 (
    echo zip圧縮処理で異常終了しました。戻り値：%errorlevel% > %logfile%
    goto end
)

rem バックアップファイルを2019backupサーバーに転送
robocopy %targetPath% %backupPath% %targetFile%.zip /MIR /COPY:DT /xf ~$*.* /LOG:%logfile%

:end
