import easyocr
import requests
from bs4 import BeautifulSoup # Nova ferramenta para "ler" o site

# 1. O Robô se prepara
print("Iniciando Missão Giassi...")
reader = easyocr.Reader(['pt'])

# 2. O Robô vai até a página de ofertas
url_site = "https://institucional.giassi.com.br/ofertasgiassi"
print(f"Visitando o site: {url_site}")

try:
    resposta = requests.get(url_site, timeout=30)
    sopa = BeautifulSoup(resposta.text, 'html.parser')

    # 3. O Robô procura os links das imagens dos encartes
    # Procuramos por todas as imagens que pareçam ser de ofertas
    links_encartes = []
    for img in sopa.find_all('img'):
        link = img.get('src')
        if link and 'encarte' in link.lower(): # Só pega se tiver "encarte" no nome
            if not link.startswith('http'):
                link = "https:" + link
            links_encartes.append(link)

    print(f"Encontrei {len(links_encartes)} encartes para ler!")

    # 4. O Robô lê apenas o PRIMEIRO encarte (para testar)
    if links_encartes:
        primeiro_link = links_encartes[0]
        print(f"Lendo o encarte: {primeiro_link}")
        
        img_data = requests.get(primeiro_link).content
        with open('oferta_giassi.jpg', 'wb') as f:
            f.write(img_data)

        print("Traduzindo os preços... (aguarde)")
        resultado = reader.readtext('oferta_giassi.jpg', detail=0)

        print("\n--- O QUE O ROBÔ LEU NO GIASSI ---")
        for texto in resultado:
            # Aqui vamos filtrar só o que parece preço ou nome de produto depois
            print(texto)
    else:
        print("Não encontrei nenhum link de encarte. Talvez o site mudou o desenho?")

except Exception as e:
    print(f"Erro na missão: {e}")
