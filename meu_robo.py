import easyocr
import requests

# 1. O Robô pega a Lupa (Prepara o leitor de Português)
print("Preparando a lupa...")
reader = easyocr.Reader(['pt'])

# 2. O Robô escolhe uma imagem para ler (Vou usar uma de teste)
# Aqui depois colocaremos o link do Giassi
url_imagem = "https://img.itdg.com.br/tdg/assets/default/blog_recipe/pic_2b9b8b8.jpg" # Foto de exemplo
img_data = requests.get(url_imagem).content
with open('foto_teste.jpg', 'wb') as handler:
    handler.write(img_data)

# 3. O Robô lê a imagem
print("Lendo a imagem... aguarde um pouquinho.")
resultado = reader.readtext('foto_teste.jpg', detail=0)

# 4. O Robô mostra o que aprendeu
print("--- O que eu encontrei escrito na foto: ---")
for texto in resultado:
    print(texto)
