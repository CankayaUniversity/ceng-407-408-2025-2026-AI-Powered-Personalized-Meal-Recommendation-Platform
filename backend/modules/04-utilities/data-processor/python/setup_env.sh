#!/bin/bash

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}>>> Python Sanal Ortamı Kuruluyor...${NC}"

# Scriptin bulunduğu dizine git
cd "$(dirname "$0")"

# Mevcut .venv varsa sil (temiz kurulum için opsiyonel, ama hata riskini azaltır)
if [ -d ".venv" ]; then
    echo -e "Mevcut .venv bulundu, üzerine yazılıyor..."
fi

# Sanal ortam oluştur
if command -v python3 &>/dev/null; then
    python3 -m venv .venv
elif command -v python &>/dev/null; then
    python -m venv .venv
else
    echo -e "${RED}>>> HATA: Python bulunamadı! Lütfen Python'ın yüklü olduğundan emin olun.${NC}"
    exit 1
fi

# Aktif et
source .venv/bin/activate

# Pip güncelle
echo -e "${BLUE}>>> Pip güncelleniyor...${NC}"
pip install --upgrade pip

# Bağımlılıkları yükle
echo -e "${BLUE}>>> Bağımlılıklar yükleniyor...${NC}"
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    echo -e "${GREEN}>>> Kurulum başarıyla tamamlandı!${NC}"
else
    echo -e "${RED}>>> HATA: requirements.txt bulunamadı!${NC}"
    exit 1
fi

echo -e "${BLUE}>>> Not: IDE (IntelliJ/PyCharm) ayarlarından bu dizindeki '.venv/bin/python' dosyasını Interpreter olarak seçmeyi unutmayın.${NC}"
