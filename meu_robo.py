import easyocr
import requests
import fitz  # Para ler PDFs
from bs4 import BeautifulSoup
from supabase import create_client
# --- COLOQUE SUAS CHAVES AQUI ---
# Substitua o que está entre aspas pelo que você copiou do Supabase
SUPABASE_URL = "https://ucivqrusibgpryglruva.supabase.co"  # <--- COLA A URL AQUI
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXZxcnVzaWJncHJ5Z2xydXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTc0MzIsImV4cCI6MjA5MDczMzQzMn0.76FadfwIFVuqDYMuf8N7wmM5MW2ahToyRg4cxCxCyh0"     # <--- COLA A ANON KEY AQUI

# 1. Preparação
print("Iniciando Super Robô Clubmy - Multi-Lojas")
reader = easyocr.Reader(['pt'])

# Lista de missões
lojas = [
    {"nome": "Giassi", "url": "https://institucional.giassi.com.br/ofertasgiassi", "tipo": "imagem"},
    {"nome": "Bistek", "url": "https://www.bistek.com.br/exclusivo-site?order=OrderByTopSaleDESC", "tipo": "texto"},
    {"nome": "MM Rosso", "url": "https://www.mmrosso.com/_files/ugd/5c9871_f34e2529198f4d648c292b4cb4e62cf9.pdf", "tipo": "pdf"},
    {"nome": "Angeloni", "url": "https://www.angeloni.com.br/super/super-ofertas", "tipo": "imagem"},
    {"nome": "Combo", "url": "https://www.comboatacadista.com.br/ofertascombo", "tipo": "imagem"},
    {"nome": "Koch", "url": "https://www.superkoch.com.br/promocoes", "tipo": "imagem"}
]

def ler_pdf(url):
    print(f"Baixando PDF...")
    res = requests.get(url)
    with open("oferta.pdf", "wb") as f:
        f.write(res.content)
    doc = fitz.open("oferta.pdf")
    texto_completo = ""
    for pagina in doc:
        texto_completo += pagina.get_text()
    return texto_completo

def ler_texto_site(url):
    print(f"Lendo texto direto do site...")
    res = requests.get(url)
    sopa = BeautifulSoup(res.text, 'html.parser')
    # Tenta pegar nomes de produtos e preços (ajustável conforme o site)
    return sopa.get_text()

# Executar missões
for loja in lojas:
    print(f"\n--- VISITANDO: {loja['nome']} ---")
    try:
        if loja["tipo"] == "pdf":
            resultado = ler_pdf(loja["url"])
            print(resultado[:500]) # Mostra os primeiros 500 caracteres
            
        elif loja["tipo"] == "texto":
            resultado = ler_texto_site(loja["url"])
            print(resultado[:500])
            
        elif loja["tipo"] == "imagem":
            # Aqui vai a lógica que já fizemos para o Giassi (simplificada para o teste)
            print(f"Buscando imagens em {loja['url']}...")
            # (O robô vai repetir o que já aprendeu sobre buscar <img> e usar easyocr)
            print("Lógica de imagem pronta para processar.")

    except Exception as e:
        print(f"Não consegui ler a loja {loja['nome']}: {e}")

print("\nMissão concluída!")
