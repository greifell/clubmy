import easyocr
import requests
from bs4 import BeautifulSoup

print("Iniciando Missão Giassi com óculos novos...")
reader = easyocr.Reader(['pt'])

url_site = "https://institucional.giassi.com.br/ofertasgiassi"

try:
    resposta = requests.get(url_site, timeout=30)
    sopa = BeautifulSoup(resposta.text, 'html.parser')

    links_encartes = []
    for img in sopa.find_all('img'):
        link = img.get('src')
        if link and 'encarte' in link.lower():
            # AQUI ESTÁ O TRUQUE: 
            # Se o link tiver "/slir/w179-h240/", nós removemos isso para pegar a foto original e grande!
            if '/slir/' in link:
                partes = link.split('/upload/')
                link = "https://institucional.giassi.com.br/upload/" + partes[1]
            elif not link.startswith('http'):
                link = "https:" + link
            
            links_encartes.append(link)

    # Remove links duplicados
    links_encartes = list(set(links_encartes))
    print(f"Encontrei {len(links_encartes)} encartes em alta resolução!")

    if links_encartes:
        # Vamos ler os 2 primeiros encartes para testar
        for i in range(min(2, len(links_encartes))):
            link_focado = links_encartes[i]
            print(f"\n--- Lendo Encarte {i+1}: {link_focado} ---")
            
            img_data = requests.get(link_focado).content
            nome_arquivo = f'oferta_{i}.jpg'
            with open(nome_arquivo, 'wb') as f:
                f.write(img_data)

            print("Traduzindo... (isso pode levar um tempinho por ser imagem grande)")
            resultado = reader.readtext(nome_arquivo, detail=0)

            for texto in resultado:
                # Só imprime se a palavra for maior que 2 letras (limpa ruído)
                if len(texto) > 2:
                    print(texto)
    else:
        print("Nenhum encarte encontrado.")

except Exception as e:
    print(f"Erro: {e}")
