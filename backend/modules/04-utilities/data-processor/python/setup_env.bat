@echo off
setlocal

echo >>> Python Sanal Ortami (Windows) Kuruluyor...

:: Scriptin bulundugu dizine git
cd /d %~dp0

:: .venv var mi kontrol et
if exist .venv (
    echo Mevcut .venv bulundu, uzerine yaziliyor...
)

:: Python komutunu tespit et (python veya py)
where python >nul 2>nul
if %errorlevel% equ 0 (
    set PY_CMD=python
) else (
    where py >nul 2>nul
    if %errorlevel% equ 0 (
        set PY_CMD=py
    ) else (
        echo [HATA] Python bulunamadi! Lutfen Python'in yuklu ve PATH'e ekli oldugundan emin olun.
        exit /b 1
    )
)

:: Sanal ortam olustur
%PY_CMD% -m venv .venv
if %errorlevel% neq 0 (
    echo [HATA] Sanal ortam olusturulamadi!
    exit /b %errorlevel%
)

:: Aktif et ve yuklemeleri yap
echo >>> Sanal ortam aktif ediliyor ve paketler yukleniyor...
call .venv\Scripts\activate.bat

:: Pip guncelle
echo >>> Pip guncelleniyor...
python -m pip install --upgrade pip

:: Bagimliliklari yukle
if exist requirements.txt (
    echo >>> Bagimliliklar yukleniyor...
    pip install -r requirements.txt
    echo [BASARILI] Kurulum tamamlandi!
) else (
    echo [HATA] requirements.txt bulunamadi!
    exit /b 1
)

echo.
echo >>> Not: IDE (IntelliJ/PyCharm) ayarlarindan bu dizindeki '.venv\Scripts\python.exe' dosyasini Interpreter olarak secmeyi unutmayin.
echo.

pause
