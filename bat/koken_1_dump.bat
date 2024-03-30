@echo off

rem MySQL�f�[�^�x�[�X�̃o�b�N�A�b�v���� 2023/12/27 ���V�X�e���� �n��

rem �e��t�@�C���ƃt�H���_�̐ݒ�
set logfile=%~dp0%~n0.log
set targetFile=koken_1.dump
set targetPath=D:\Users\Administrator\Desktop
set backupPath=\\2019backup\Backup\700_���̑�\760_�|�[�^���T�[�o

rem �f�[�^�x�[�X[koken_1]�̃o�b�N�A�b�v
mysqldump -u root -pKoken4151@ koken_1 > %targetFile%
if not %ERRORLEVEL% == 0 (
    echo �f�[�^�x�[�X�̃o�b�N�A�b�v�ňُ�I�����܂����B�߂�l�F%errorlevel% > %logfile%
    goto end
)

rem �o�b�N�A�b�v�t�@�C���̈��k�iPowerShell�̃R�}���h���b�g�����s�j
set psCommand=powershell -NoProfile -ExecutionPolicy Unrestricted Compress-Archive -Path %targetPath%\%targetFile% -DestinationPath %targetPath%\%targetFile%.zip -Force
%psCommand%
if not %ERRORLEVEL% == 0 (
    echo zip���k�����ňُ�I�����܂����B�߂�l�F%errorlevel% > %logfile%
    goto end
)

rem �o�b�N�A�b�v�t�@�C����2019backup�T�[�o�[�ɓ]��
robocopy %targetPath% %backupPath% %targetFile%.zip /MIR /COPY:DT /xf ~$*.* /LOG:%logfile%

:end
