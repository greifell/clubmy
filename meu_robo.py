import easyocr
import requests
import fitz
from bs4 import BeautifulSoup
from supabase import create_client

# --- CONFIGURAÇÕES ---
SUPABASE_URL = "https://ucivqrusibgpryglruva.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXZxcnVzaWJncHJ5Z2xydXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTc0MzIsImV4cCI6MjA5MDczMzQzMn0.76FadfwIFVuqDYMuf8N7wmM5MW2ahToyRg4cxCxCyh0"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Iniciando Robô Clubmy v2.0 (Padrão Lovable)...")

# 1. Prepara a "lupa" para ler imagens
reader = easyocr.Reader(['pt'])

def salvar_no_site(produto, preco, loja, municipio="Criciúma"):
    """Envia os dados para a tabela oficial do Lovable (promotions)"""
    try:
        dados = {
            "product_name": str(produto).strip(),
            "price": str(preco).strip(),
            "supermarket": loja,
            "city": municipio,
            "state": "SC",
            "valid_until": "Ver encarte",
            "status": "approved"  # Garante que a oferta apareça como aprovada no site
        }
        
        # Enviando para a tabela 'promotions' (minúsculo conforme Lovable informou)
        supabase.table("promotions").insert(dados).execute()
        print(f"✅ Salvo: {produto} - {preco} ({loja})")
    except Exception as e:
        print(f"❌ Erro ao salvar {produto}: {e}")

# --- MISSÃO 1: GIASSI (Extração de Imagem) ---
print("\n--- BUSCANDO OFERTAS NO GIASSI ---")
try:
    res = requests.get("https://institucional.giassi.com.br/ofertasgiassi", timeout=30)
    sopa = BeautifulSoup(res.text, 'html.parser')
    
    links_achados = []
    for img in sopa.find_all('img'):
        link = img.get('src')
        if link and 'encarte' in link.lower():
            # Ajuste para pegar imagem em alta resolução
            if '/slir/' in link:
                link = "https://institucional.giassi.com.br/upload/" + link.split('/upload/')[1]
            elif not link.startswith('http'):
                link = "https:" + link
            links_achados.append(link)

    # Processa os 2 primeiros encartes para teste
    for link in list(set(links_achados))[:2]:
        print(f"Lendo encarte: {link}")
        img_data = requests.get(link).content
        with open('temp.jpg', 'wb') as f:
            f.write(img_data)
        
        texto_lido = reader.readtext('temp.jpg', detail=0)
        
        # Lógica de extração: Procura preços (números com vírgula)
        for i, texto in enumerate(texto_lido):
            if "," in texto and any(char.isdigit() for char in texto):
                produto = texto_lido[i-1] if i > 0 else "Produto Giassi"
                # Limpa textos muito curtos ou ruídos
                if len(produto) > 2:
                    salvar_no_site(produto, texto, "Giassi", "Geral")
except Exception as e:
    print(f"Erro na missão Giassi: {e}")

# --- MISSÃO 2: MM ROSSO (Extração de PDF) ---
print("\n--- BUSCANDO OFERTAS NO MM ROSSO ---")
try:
    url_rosso = "https://www.mmrosso.com/_files/ugd/5c9871_f34e2529198f4d648c292b4cb4e62cf9.pdf"
    res_pdf = requests.get(url_rosso, timeout=30)
    with open("rosso.pdf", "wb") as f:
        f.write(res_pdf.content)
        
    doc = fitz.open("rosso.pdf")
    for pagina in doc:
        linhas = pagina.get_text().split('\n')
        for i, linha in enumerate(linhas):
            # Se a linha contém R$, identificamos como preço
            if "R$" in linha:
                produto = linhas[i-1] if i > 0 else "Oferta Rosso"
                if len(produto) > 3:
                    salvar_no_site(produto, linha, "MM Rosso", "Criciúma")
except Exception as e:
    print(f"Erro na missão MM Rosso: {e}")

print("\n--- MISSÃO CONCLUÍDA ---")
