const graficoCanvas = document.getElementById('meuGrafico').getContext('2d');
const tempoDecorridoElement = document.getElementById('tempo-decorrido');
const distanciaPercorridaElement = document.getElementById('distancia-percorrida');
const iniciarCaminhadaBotao = document.getElementById('iniciar-caminhada');
const pararCaminhadaBotao = document.getElementById('parar-caminhada');
const mapaContainer = document.getElementById('mapa-container');

let watchId;
let startTime;
let previousPosition = null;
let totalDistance = 0;
let timerInterval;
let distanceData = [];
let timeData = [];
let pathCoordinates = [];
let meuGrafico;
let mapa;
let polyline;
let primeiraCoordenadaRecebida = false;

function obterLocalizacaoInicial() {
    console.log("Obtendo localização inicial...");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(mostrarLocalizacaoInicial, tratarErroLocalizacaoInicial);
    } else {
        alert("Geolocalização não suportada neste navegador.");
    }
}

function mostrarLocalizacaoInicial(position) {
    const { latitude, longitude } = position.coords;
    console.log("Localização Inicial Obtida:", latitude, longitude);
    inicializarMapa(latitude, longitude); // Inicializa o mapa com a localização inicial
    primeiraCoordenadaRecebida = true; // Marca que a primeira coordenada foi recebida
}

function tratarErroLocalizacaoInicial(error) {
    console.warn('Erro ao obter localização inicial:', error.message);
    inicializarMapa(-20.0, -45.0); // Inicializa o mapa com a localização padrão em caso de erro
}

function iniciarCaminhada() {
    console.log("Botão Iniciar Caminhada foi clicado!");
    startTime = Date.now();
    totalDistance = 0;
    previousPosition = null;
    distanceData = [];
    timeData = [];
    pathCoordinates = [];
    tempoDecorridoElement.textContent = '00:00:00';
    distanciaPercorridaElement.textContent = '0.00 km';

    inicializarGrafico();

    watchId = navigator.geolocation.watchPosition(atualizarLocalizacao, tratarErro, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    });

    timerInterval = setInterval(atualizarTempo, 1000);
    iniciarCaminhadaBotao.disabled = true;
    pararCaminhadaBotao.disabled = false;
}

function pararCaminhada() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        clearInterval(timerInterval);
        iniciarCaminhadaBotao.disabled = false;
        pararCaminhadaBotao.disabled = true;
        console.log("Caminhada finalizada. Distância total:", totalDistance.toFixed(2) + " km");
        desenharRotaNoMapa();
    }
}

function atualizarLocalizacao(position) {
    const { latitude, longitude } = position.coords;
    const timestamp = position.timestamp;

    pathCoordinates.push([latitude, longitude]);
    console.log("Coordenadas adicionadas:", latitude, longitude, "Tamanho do Path:", pathCoordinates.length);

    if (!primeiraCoordenadaRecebida && mapa) {
        mapa.setView([latitude, longitude], 15); // Centralizar na primeira localização (redundante agora, mas seguro)
        primeiraCoordenadaRecebida = true;
    }

    if (previousPosition) {
        const distance = calcularDistancia(previousPosition.latitude, previousPosition.longitude, latitude, longitude);
        totalDistance += distance;
        console.log("Distância Incrementada:", distance, "Distância Total:", totalDistance);
    }

    previousPosition = { latitude, longitude };
    distanciaPercorridaElement.textContent = totalDistance.toFixed(2) + ' km';

    atualizarGrafico(timestamp);
    atualizarMapaComNovaCoordenada(latitude, longitude);
}

function tratarErro(error) {
    console.warn('Erro ao obter localização (rastreamento):', error.message);
}

function atualizarTempo() {
    const currentTime = Date.now();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);

    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;

    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    tempoDecorridoElement.textContent = formattedTime;
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distância em km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function inicializarGrafico() {
    meuGrafico = new Chart(graficoCanvas, {
        type: 'line',
        data: {
            labels: timeData.map(t => new Date(t)),
            datasets: [{
                label: 'Distância (km)',
                data: distanceData,
                borderColor: '#bb86fc',
                backgroundColor: 'rgba(187, 134, 252, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'second',
                        displayFormats: {
                            second: 'HH:mm:ss'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tempo (HH:MM:SS)',
                        color: '#e0e0e0'
                    },
                    ticks: {
                        color: '#9e9e9e'
                    },
                    grid: {
                        color: '#373737'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Distância (km)',
                        color: '#e0e0e0'
                    },
                    ticks: {
                        color: '#9e9e9e'
                    },
                    grid: {
                        color: '#373737'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e0e0e0'
                    }
                }
            }
        }
    });
}

function inicializarMapa(latitude, longitude) {
    mapa = L.map('mapa-container').setView([latitude, longitude], 15); // Centraliza na localização inicial
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapa);
}

function desenharRotaNoMapa() {
    console.log("Desenhando rota. Tamanho do Path:", pathCoordinates.length, "Mapa Existente:", !!mapa);
    if (mapa && pathCoordinates.length > 1) {
        if (polyline) {
            mapa.removeLayer(polyline);
        }
        polyline = L.polyline(pathCoordinates, { color: 'blue' }).addTo(mapa);
        mapa.fitBounds(polyline.getBounds());
    } else if (mapa && pathCoordinates.length === 1 && mapa) {
        mapa.setView(pathCoordinates[0], 15); // Centralizar no ponto inicial se houver apenas um ponto
    }
}

function atualizarMapaComNovaCoordenada(latitude, longitude) {
    console.log("Nova coordenada:", latitude, longitude, "Mapa Existente:", !!mapa, "Polyline Existente:", !!polyline);
    if (mapa) {
        if (!polyline) {
            polyline = L.polyline([latitude, longitude], { color: 'blue' }).addTo(mapa);
        } else {
            polyline.addLatLng([latitude, longitude]);
        }
        // Opcional: Centralizar o mapa na última localização continuamente
        // mapa.setView([latitude, longitude], 15);
    }
}

// Chamar a função para obter a localização inicial assim que o script carregar
obterLocalizacaoInicial();

// Certificar que o event listener está aqui
iniciarCaminhadaBotao.addEventListener('click', iniciarCaminhada);
pararCaminhadaBotao.addEventListener('click', pararCaminhada);
