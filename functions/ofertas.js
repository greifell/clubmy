const axios = require('axios');
const cheerio = require('cheerio');

// Simulação de dados para demonstração
function gerarDadosSimulados() {
  const produtos = [
    "Arroz Tio João 5kg", "Feijão Carioca Camil 1kg", "Óleo de Soja Liza 900ml",
    "Café Pilão Torrado e Moído 500g", "Açúcar Refinado União 1kg", "Leite Integral Tirol 1L",
    "Macarrão Espaguete Renata 500g", "Molho de Tomate Quero 340g", "Biscoito Cream Cracker Piraquê 200g",
    "Sabão em Pó Omo 1,6kg", "Papel Higiênico Neve 12 rolos", "Detergente Ypê 500ml"
  ];
  
  const supermercados = [
    { nome: "Zaffari", regiao: "RS" },
    { nome: "Angeloni", regiao: "SC" },
    { nome: "Condor", regiao: "PR" }
  ];
  
  const ofertas = [];
  
  for (const supermercado of supermercados) {
    for (const produto of produtos) {
      // Gerar preços aleatórios
      const precoAtual = parseFloat((Math.random() * 22 + 3.5).toFixed(2));
      const desconto = Math.floor(Math.random() * 35) + 5;
      const precoAnterior = parseFloat((precoAtual / (1 - desconto/100)).toFixed(2));
      
      ofertas.push({
        nome: produto,
        preco_atual: precoAtual,
        preco_anterior: precoAnterior,
        desconto: desconto,
        imagem: `https://exemplo.com/imagens/${produto.toLowerCase().replace(/ /g, '_')}.jpg`,
        data_coleta: new Date().toISOString().split('T')[0],
        supermercado: supermercado.nome,
        regiao: supermercado.regiao
      });
    }
  }
  
  return ofertas;
}

// Função para extrair dados do Zaffari (exemplo conceitual)
async function extrairOfertasZaffari() {
  try {
    const url = 'https://www.zaffari.com.br/ofertas';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    
    const $ = cheerio.load(response.data);
    const ofertas = [];
    
    // Nota: Estes seletores são exemplos e precisariam ser ajustados
    // com base na estrutura real do site
    $('.produto-item').each((i, el) => {
      const nome = $(el).find('.produto-nome').text().trim();
      let precoAtual = $(el).find('.produto-preco-atual').text().trim();
      let precoAnterior = $(el).find('.produto-preco-anterior').text().trim();
      
      // Limpar e formatar preços
      precoAtual = parseFloat(precoAtual.replace('R$', '').replace(',', '.').trim());
      precoAnterior = parseFloat(precoAnterior.replace('R$', '').replace(',', '.').trim());
      
      // Calcular desconto
      const desconto = Math.round(((precoAnterior - precoAtual) / precoAnterior) * 100);
      
      // Obter URL da imagem
      const imgUrl = $(el).find('img').attr('src') || '';
      
      ofertas.push({
        nome: nome,
        preco_atual: precoAtual,
        preco_anterior: precoAnterior,
        desconto: desconto,
        imagem: imgUrl,
        data_coleta: new Date().toISOString().split('T')[0],
        supermercado: 'Zaffari',
        regiao: 'RS'
      });
    });
    
    return ofertas;
  } catch (error) {
    console.error(`Erro ao extrair ofertas do Zaffari: ${error.message}`);
    return [];
  }
}

// Função principal que será exportada como função serverless
exports.handler = async (event, context) => {
  // Configuração de CORS para permitir acesso do seu domínio
  const headers = {
    'Access-Control-Allow-Origin': 'https://clubmy.com.br',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Verificar se é uma requisição OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Preflight call successful' }),
    };
  }

  try {
    // Parâmetros da requisição
    const params = event.queryStringParameters || {};
    const cidade = params.cidade || '';
    const supermercado = params.supermercado || '';
    
    // Em um ambiente de produção, você tentaria fazer o scraping real
    // const ofertasZaffari = await extrairOfertasZaffari();
    
    // Para demonstração, usamos dados simulados
    console.log('Gerando dados simulados para demonstração...');
    const todasOfertas = gerarDadosSimulados();
    
    // Filtrar resultados com base nos parâmetros
    let resultados = todasOfertas;
    
    if (cidade) {
      resultados = resultados.filter(oferta => oferta.regiao === cidade);
    }
    
    if (supermercado) {
      resultados = resultados.filter(oferta => oferta.supermercado === supermercado);
    }
    
    // Retornar os resultados
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ofertas: resultados,
        total: resultados.length,
        data_atualizacao: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('Erro:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao processar a requisição' }),
    };
  }
};
