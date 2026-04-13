import easyocr
import requests
import os

# 1. O Robô pega a Lupa
print("Preparando a lupa (EasyOCR)...")
reader = easyocr.Reader(['pt'])

# 2. O Robô escolhe uma imagem de teste mais estável (uma placa de rua ou aviso)
# Vamos usar uma imagem do próprio Wikipédia que nunca cai
url_imagem = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Tag_Price_1299.jpg/320px-Tag_Price_1299.jpg"

try:
    print(f"Tentando buscar a imagem em: {url_imagem}")
    resposta = requests.get(url_imagem, timeout=30)
    resposta.raise_for_status() # Verifica se o site respondeu OK
    
    with open('foto_teste.jpg', 'wb') as f:
        f.write(resposta.content)
    print("Imagem baixada com sucesso!")

    # 3. O Robô lê a imagem
    print("Traduzindo a imagem... (isso pode levar 1 minuto)")
    resultado = reader.readtext('foto_teste.jpg', detail=0)

    # 4. O Robô mostra o que aprendeu
    print("\n--- RESULTADO DA LEITURA ---")
    if resultado:
        for texto in resultado:
            print(f"Encontrei: {texto}")
    else:
        print("Não encontrei nenhum texto na imagem.")

except Exception as e:
    print(f"Ops! Tive um problema ao buscar a foto: {e}")
