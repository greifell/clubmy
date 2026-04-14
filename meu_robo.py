from supabase import create_client

# 1. COLOQUE SUAS CHAVES AQUI
# Verifique se não há espaços antes ou depois da chave dentro das aspas
SUPABASE_URL = "https://ucivqrusibgpryglruva.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXZxcnVzaWJncHJ5Z2xydXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTc0MzIsImV4cCI6MjA5MDczMzQzMn0.76FadfwIFVuqDYMuf8N7wmM5MW2ahToyRg4cxCxCyh0"

try:
    print("Iniciando conexão...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 2. TENTANDO SALVAR UM DADO DE TESTE
    print("Tentando enviar dado de teste...")
    dados_teste = {
        "produto": "TESTE DE CONEXAO",
        "preco": "10.00",
        "loja": "LABORATORIO",
        "validade": "HOJE",
        "municipio": "CRICIUMA"
    }
    
    resposta = supabase.table("Ofertas").insert(dados_teste).execute()
    
    print("--- RESPOSTA DO SERVIDOR ---")
    print(resposta)
    print("\n✅ SE VOCÊ ESTÁ VENDO ISSO, O DADO CHEGOU NO SUPABASE!")

except Exception as e:
    print(f"\n❌ ERRO DETECTADO: {e}")
