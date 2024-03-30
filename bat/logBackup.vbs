'***** 運用ログのバックアップ *****
' log4js の debug.log.yyyy-mm-dd が翌日消されてしまうので名前を変えてコピーしておく
' 2023-09-01 y.watanabe

Set fs = WScript.CreateObject("Scripting.FileSystemObject")

' 基準日設定
If Weekday(Now) = 2 Then
	dt = DateAdd("d", -3, Date)
Else
	dt = DateAdd("d", -1, Date)
End If

' 変数設定
yyyy = Year(dt)
mm = Right("0" & Month(dt), 2)
dd = Right("0" & Day(dt), 2)

' デバッグログコピー
source = "D:\Node.js\koken-portal\log\" & "debug.log." & yyyy & "-" & mm & "-" & dd
dest   = "D:\Node.js\koken-portal\log\" & "debug_" & yyyy & "-" & mm & "-" & dd & ".log"
If fs.FileExists( source ) Then
	fs.CopyFile source, dest
End If

' エラーログあればコピー
source = "D:\Node.js\koken-portal\log\" & "error.log." & yyyy & "-" & mm & "-" & dd
dest   = "D:\Node.js\koken-portal\log\" & "error_" & yyyy & "-" & mm & "-" & dd & ".log"
If fs.FileExists( source ) Then
	fs.CopyFile source, dest
End If
