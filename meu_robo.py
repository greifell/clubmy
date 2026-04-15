import easyocr
import requests
import fitz
from bs4 import BeautifulSoup
from supabase import create_client

# --- CONFIGURAÇÕES ---
SUPABASE_URL = "https://ucivqrusibgpryglruva.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXZxcnVzaWJncHJ5Z2xydXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTc0MzIsImV4cCI6MjA5MDczMzQzMn0.76FadfwIFVuqDYMuf8N7wmM5MW2ahToyRg4cxCxCyh0"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
reader = easyocr.Reader(['pt'])

def limpar_banco_total():
    print("\n--- 🧹 FAXINA TOTAL ---")
    try:
        supabase.table("promotions").delete().gt("id", 0).execute()
        print("✅ Banco limpo!")
    except Exception as e: print(f"Erro limpeza: {e}")

def salvar_no_site(produto, preco, loja, municipio="Criciúma"):
    # Filtro mais permissivo: nomes com pelo menos 3 letras
    if len(str(produto)) < 3 or "VÁLIDAS" in str(produto).upper():
        return
    try:
        dados = {
            "product_name": str(produto).strip()[:100],
            "price": str(preco).strip(),
            "supermarket": loja,
            "city": municipio,
            "state": "SC",
            "valid_until": "Ver encarte",
            "status": "approved"
        }
        supabase.table("promotions").insert(dados).execute()
        print(f"✅ {loja}: {produto}")
    except Exception as e: print(f"❌ Erro Supabase: {e}")

# --- 1. BISTEK (API com Headers de Navegador) ---
def ler_bistek():
    print("\n--- 🛒 LENDO BISTEK ---")
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        url = "https://www.bistek.com.br/api/catalog_system/pub/products/search?fq=H:143"
        res = requests.get(url, headers=headers, timeout=30)
        produtos = res.json()
        for p in produtos:
            try:
                nome = p['productName']
                preco = p['items'][0]['sellers'][0]['commertialOffer']['Price']
                if preco > 0:
                    salvar_no_site(nome, f"R$ {preco:.2f}".replace('.', ','), "Bistek")
            except: continue
    except Exception as e: print(f"Erro Bistek: {e}")

# --- 2. MM ROSSO (PDF) ---
def ler_mmrosso():
    print("\n--- 🛒 LENDO MM ROSSO ---")
    try:
        url = "https://www.mmrosso.com/_files/ugd/5c9871_f34e2529198f4d648c292b4cb4e62cf9.pdf"
        res = requests.get(url, timeout=30)
        with open("rosso.pdf", "wb") as f: f.write(res.content)
        doc = fitz.open("rosso.pdf")
        for pagina in doc:
            linhas = pagina.get_text().split('\n')
            for i, linha in enumerate(linhas):
                if "R$" in linha:
                    produto = linhas[i-1] if i > 0 else "Oferta"
                    salvar_no_site(produto, linha, "MM Rosso")
    except Exception as e: print(f"Erro MM Rosso: {e}")

# --- 3. COMBO & KOCH (Busca de Imagem Flexível) ---
def ler_encartes_grupo_koch(url, nome_loja):
    print(f"\n--- 🛒 LENDO {nome_loja.upper()} ---")
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        res = requests.get(url, headers=headers, timeout=30)
        sopa = BeautifulSoup(res.text, 'html.parser')
        
        imagens_achadas = 0
        for img in sopa.find_all('img'):
            src = img.get('src') or img.get('data-src')
            if not src: continue
            
            # Se a imagem for do encarte ou tiver "offer" no nome
            if any(x in src.lower() for x in ['encarte', 'oferta', 'promo', 'offer', 'prod']):
                if src.startswith('//'): src = "https:" + src
                elif src.startswith('/') : src = "/".join(url.split("/")[:3]) + src
                elif not src.startswith('http'): src = "https://" + src

                print(f"📸 Lendo: {src}")
                img_data = requests.get(src, timeout=20).content
                with open('temp.jpg', 'wb') as f: f.write(img_data)
                
                resultado = reader.readtext('temp.jpg', detail=0)
                for i, texto in enumerate(resultado):
                    if "," in texto and any(c.isdigit() for c in texto):
                        prod = resultado[i-1] if i > 0 else "Produto"
                        salvar_no_site(prod, texto, nome_loja)
                imagens_achadas += 1
                if imagens_achadas > 5: break # Limite para não demorar demais
    except Exception as e: print(f"Erro {nome_loja}: {e}")

# --- EXECUÇÃO ---
limpar_banco_total()
ler_bistek()
ler_mmrosso()
ler_encartes_grupo_koch("https://www.comboatacadista.com.br/ofertascombo", "Combo Atacadista")
ler_encartes_grupo_koch("https://www.superkoch.com.br/promocoes", "Super Koch")
