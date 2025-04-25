// ClubMy.com.br - Script para interação com a API de promoções
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const citySelect = document.getElementById('city-select');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const featuredGrid = document.getElementById('featured-grid');
    const loadingElement = document.getElementById('loading');
    const loadMoreButton = document.getElementById('load-more');
    const lastUpdateElement = document.getElementById('last-update');
    const newsletterForm = document.getElementById('newsletter-form');
    
    // Estado da aplicação
    let currentPage = 1;
    let currentFilters = {
        cidade: '',
        supermercado: '',
        busca: ''
    };
    let allOffers = [];
    let displayedOffers = [];
    const offersPerPage = 8;
    
    // Inicialização
    init();
    
    // Função de inicialização
    function init() {
        // Carregar promoções iniciais
        fetchOffers();
        
        // Configurar event listeners
        setupEventListeners();
    }
    
    // Configurar event listeners
    function setupEventListeners() {
        // Busca
        searchButton.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        
        // Filtro por cidade
        citySelect.addEventListener('change', function() {
            currentFilters.cidade = this.value;
            resetAndFetch();
        });
        
        // Carregar mais
        loadMoreButton.addEventListener('click', function(e) {
            e.preventDefault();
            currentPage++;
            displayMoreOffers();
        });
        
        // Filtro por supermercado
        document.querySelectorAll('.supermarket-card').forEach(card => {
            card.addEventListener('click', function(e) {
                e.preventDefault();
                const supermarket = this.getAttribute('data-supermarket');
                currentFilters.supermercado = supermarket;
                resetAndFetch();
            });
        });
        
        // Newsletter
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const email = this.querySelector('input[type="email"]').value;
                if (email) {
                    alert('Obrigado por se cadastrar! Você receberá nossas promoções no email: ' + email);
                    this.reset();
                } else {
                    alert('Por favor, informe um email válido.');
                }
            });
        }
    }
    
    // Função para busca
    function handleSearch() {
        currentFilters.busca = searchInput.value.trim();
        resetAndFetch();
    }
    
    // Resetar e buscar novamente
    function resetAndFetch() {
        currentPage = 1;
        allOffers = [];
        displayedOffers = [];
        featuredGrid.innerHTML = '';
        fetchOffers();
    }
    
    // Buscar ofertas da API
    function fetchOffers() {
        showLoading(true);
        
        // Construir URL com parâmetros
        let apiUrl = '/api/ofertas';
        const params = new URLSearchParams();
        
        if (currentFilters.cidade) {
            params.append('cidade', currentFilters.cidade);
        }
        
        if (currentFilters.supermercado) {
            params.append('supermercado', currentFilters.supermercado);
        }
        
        if (params.toString()) {
            apiUrl += '?' + params.toString();
        }
        
        // Fazer requisição para a API
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao buscar promoções');
                }
                return response.json();
            })
            .then(data => {
                showLoading(false);
                
                // Atualizar data de atualização
                if (data.data_atualizacao) {
                    const updateDate = new Date(data.data_atualizacao);
                    lastUpdateElement.textContent = updateDate.toLocaleString('pt-BR');
                }
                
                // Processar ofertas
                allOffers = data.ofertas || [];
                
                // Filtrar por termo de busca se necessário
                if (currentFilters.busca) {
                    const searchTerm = currentFilters.busca.toLowerCase();
                    allOffers = allOffers.filter(offer => 
                        offer.nome.toLowerCase().includes(searchTerm)
                    );
                }
                
                // Exibir ofertas
                displayOffers();
                
                // Atualizar visibilidade do botão "Ver Mais"
                updateLoadMoreButton();
            })
            .catch(error => {
                console.error('Erro:', error);
                showLoading(false);
                featuredGrid.innerHTML = `
                    <div class="error-message">
                        <p>Não foi possível carregar as promoções. Tente novamente mais tarde.</p>
                    </div>
                `;
            });
    }
    
    // Exibir ofertas
    function displayOffers() {
        if (allOffers.length === 0) {
            featuredGrid.innerHTML = `
                <div class="no-results">
                    <p>Nenhuma promoção encontrada com os filtros selecionados.</p>
                </div>
            `;
            return;
        }
        
        // Limpar grid se for a primeira página
        if (currentPage === 1) {
            featuredGrid.innerHTML = '';
        }
        
        // Calcular índices para paginação
        const startIndex = (currentPage - 1) * offersPerPage;
        const endIndex = Math.min(startIndex + offersPerPage, allOffers.length);
        
        // Obter ofertas da página atual
        const pageOffers = allOffers.slice(startIndex, endIndex);
        displayedOffers = [...displayedOffers, ...pageOffers];
        
        // Adicionar cards ao grid
        pageOffers.forEach(offer => {
            const offerCard = createOfferCard(offer);
            featuredGrid.appendChild(offerCard);
        });
    }
    
    // Exibir mais ofertas (paginação)
    function displayMoreOffers() {
        displayOffers();
        updateLoadMoreButton();
    }
    
    // Atualizar visibilidade do botão "Ver Mais"
    function updateLoadMoreButton() {
        if (displayedOffers.length >= allOffers.length) {
            loadMoreButton.style.display = 'none';
        } else {
            loadMoreButton.style.display = 'inline-block';
        }
    }
    
    // Criar card de oferta
    function createOfferCard(offer) {
        const card = document.createElement('div');
        card.className = 'promo-card';
        
        // Formatar preços
        const precoAtual = offer.preco_atual.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        
        const precoAnterior = offer.preco_anterior.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        
        // Imagem placeholder se a imagem real não estiver disponível
        const imageSrc = offer.imagem.includes('exemplo.com') 
            ? `https://via.placeholder.com/300x200?text=${encodeURIComponent(offer.nome)}`
            : offer.imagem;
        
        card.innerHTML = `
            <div class="discount">-${offer.desconto}%</div>
            <img src="${imageSrc}" alt="${offer.nome}">
            <div class="card-content">
                <h3>${offer.nome}</h3>
                <div class="price">
                    <span class="old">${precoAnterior}</span>
                    <span class="new">${precoAtual}</span>
                </div>
                <div class="store">
                    <img src="https://via.placeholder.com/30x30?text=${offer.supermercado.charAt(0)}" alt="${offer.supermercado}">
                    <span>${offer.supermercado}</span>
                </div>
                <a href="#" class="btn-details">Ver Detalhes</a>
            </div>
        `;
        
        return card;
    }
    
    // Mostrar/ocultar indicador de carregamento
    function showLoading(show) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
    
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const nav = document.querySelector('nav');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            nav.style.display = nav.style.display === 'block' ? 'none' : 'block';
        });
    }
});
