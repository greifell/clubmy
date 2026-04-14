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
    """Remove absolutamente todas as ofertas antes de iniciar a nova busca"""
    print("\n--- 🧹 INICIANDO FAXINA TOTAL ---")
    try:
        # No Supabase, para deletar tudo, usamos um filtro que sempre seja verdadeiro.
        # Aqui dizemos: delete onde o ID não for nulo.
        resultado = supabase.table("promotions").delete().neq("status", "0").execute()
        print("✅ O banco de dados foi esvaziado. Pronto para novos dados!")
    except Exception as e:
        print(f"⚠️ Nota: O banco já devia estar vazio ou houve um erro: {e}")

def salvar_no_site(produto, preco, loja, municipio="Criciúma"):
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
    except Exception as e:
        print(f"❌ Erro ao salvar: {e}")

# --- 1. BISTEK (Extração via HTML - Super Preciso) ---
def ler_bistek():
    print("\n--- LENDO BISTEK ---")
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        res = requests.get("https://www.bistek.com.br/exclusivo-site?order=OrderByTopSaleDESC", headers=headers)
        sopa = BeautifulSoup(res.text, 'html.parser')
        # Procura os produtos na estrutura da VTEX
        produtos = sopa.find_all('section', class_='vtex-product-summary-2-x-container')
        for p in produtos:
            nome = p.find('span', class_='vtex-product-summary-2-x-productBrand').text
            preco = p.find('span', class_='vtex-product-price-1-x-currencyInteger').text
            centavos = p.find('span', class_='vtex-product-price-1-x-currencyFraction').text
            salvar_no_site(nome, f"R$ {preco},{centavos}", "Bistek")
    except Exception as e: print(f"Erro Bistek: {e}")

# --- 2. MM ROSSO (PDF) ---
def ler_mmrosso():
    print("\n--- LENDO MM ROSSO ---")
    try:
        url = "https://www.mmrosso.com/_files/ugd/5c9871_f34e2529198f4d648c292b4cb4e62cf9.pdf"
        res = requests.get(url)
        with open("rosso.pdf", "wb") as f: f.write(res.content)
        doc = fitz.open("rosso.pdf")
        for pagina in doc:
            linhas = pagina.get_text().split('\n')
            for i, linha in enumerate(linhas):
                if "R$" in linha:
                    produto = linhas[i-1] if i > 0 else "Oferta"
                    salvar_no_site(produto, linha, "MM Rosso")
    except Exception as e: print(f"Erro MM Rosso: {e}")

# --- 3. COMBO & KOCH (Encartes de Imagem/OCR) ---
def ler_encartes_grupo_koch(url, nome_loja):
    print(f"\n--- LENDO {nome_loja.upper()} ---")
    try:
        res = requests.get(url)
        sopa = BeautifulSoup(res.text, 'html.parser')
        # Procura as imagens dos encartes
        for img in sopa.find_all('img'):
            src = img.get('src')
            if src and ('encarte' in src.lower() or 'oferta' in src.lower()):
                if not src.startswith('http'): src = "https:" + src
                img_data = requests.get(src).content
                with open('temp.jpg', 'wb') as f: f.write(img_data)
                resultado = reader.readtext('temp.jpg', detail=0)
                for i, texto in enumerate(resultado):
                    if "," in texto and any(c.isdigit() for c in texto):
                        prod = resultado[i-1] if i > 0 else "Produto"
                        salvar_no_site(prod, texto, nome_loja)
                break # Lê a primeira página para teste
    except Exception as e: print(f"Erro {nome_loja}: {e}")

# --- EXECUÇÃO ---
ler_bistek()
ler_mmrosso()
ler_encartes_grupo_koch("https://www.comboatacadista.com.br/ofertascombo", "Combo Atacadista")
ler_encartes_grupo_koch("https://www.superkoch.com.br/promocoes", "Super Koch")

print("\n--- TODOS OS SITES PROCESSADOS ---")
