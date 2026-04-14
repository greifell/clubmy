import easyocr
import requests
import fitz
from bs4 import BeautifulSoup
from supabase import create_client

# --- CONFIGURAÇÕES ---
SUPABASE_URL = "https://ucivqrusibgpryglruva.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXZxcnVzaWJncHJ5Z2xydXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTc0MzIsImV4cCI6MjA5MDczMzQzMn0.76FadfwIFVuqDYMuf8N7wmM5MW2ahToyRg4cxCxCyh0"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Iniciando Robô Clubmy Oficial...")
reader = easyocr.Reader(['pt'])

def salvar_no_site(produto, preco, loja, municipio="Geral"):
    try:
        dados = {
            "produto": str(produto).strip(),
            "preco": str(preco).strip(),
            "loja": loja,
            "municipio": municipio,
            "validade": "Ver encarte"
        }
        # Note o "O" maiúsculo conforme sua tabela
        supabase.table("Ofertas").insert(dados).execute()
        print(f"✅ Sucesso: {produto} - {preco} ({loja})")
    except Exception as e:
        print(f"❌ Erro ao salvar {produto}: {e}")

# --- MISSÃO 1: GIASSI (Imagem/OCR) ---
print("\n--- LENDO GIASSI ---")
try:
    res = requests.get("https://institucional.giassi.com.br/ofertasgiassi")
    sopa = BeautifulSoup(res.text, 'html.parser')
    for img in sopa.find_all('img'):
        link = img.get('src')
        if link and 'encarte' in link.lower():
            if '/slir/' in link:
                link = "https://institucional.giassi.com.br/upload/" + link.split('/upload/')[1]
            
            print(f"Processando imagem: {link}")
            img_data = requests.get(link).content
            with open('temp.jpg', 'wb') as f: f.write(img_data)
            
            texto_lido = reader.readtext('temp.jpg', detail=0)
            # Lógica simples: Se encontrar algo com vírgula (preço), pega a palavra anterior (produto)
            for i, texto in enumerate(texto_lido):
                if "," in texto and any(char.isdigit() for char in texto):
                    produto = texto_lido[i-1] if i > 0 else "Produto não identificado"
                    salvar_no_site(produto, texto, "Giassi")
            break # Lê apenas o primeiro encarte para não demorar no teste
except Exception as e:
    print(f"Erro no Giassi: {e}")

# --- MISSÃO 2: MM ROSSO (PDF) ---
print("\n--- LENDO MM ROSSO ---")
try:
    url_rosso = "https://www.mmrosso.com/_files/ugd/5c9871_f34e2529198f4d648c292b4cb4e62cf9.pdf"
    res_pdf = requests.get(url_rosso)
    with open("rosso.pdf", "wb") as f: f.write(res_pdf.content)
    doc = fitz.open("rosso.pdf")
    for pagina in doc:
        linhas = pagina.get_text().split('\n')
        for i, linha in enumerate(linhas):
            if "R$" in linha:
                # No PDF, geralmente o nome do produto está na linha acima do preço
                produto = linhas[i-1] if i > 0 else "Oferta PDF"
                salvar_no_site(produto, linha, "MM Rosso", "Criciúma/Região")
except Exception as e:
    print(f"Erro no MM Rosso: {e}")

print("\nMissão concluída!")
