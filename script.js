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

function iniciarCaminhada() {
    if (navigator.geolocation) {
        startTime = Date.now();
        totalDistance = 0;
        previousPosition = null;
        distanceData = [];
        timeData = [];
        pathCoordinates = [];
        tempoDecorridoElement.textContent = '00:00:00';
        distanciaPercorridaElement.textContent = '0.00 km';

        watchId = navigator.geolocation.watchPosition(atualizarLocalizacao, tratarErro, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });

        timerInterval = setInterval(atualizarTempo, 1000);
        iniciarCaminhadaBotao.disabled = true;
        pararCaminhadaBotao.disabled = false;

        inicializarGrafico();
        inicializarMapa();

    } else {
        alert("Geolocalização não suportada neste navegador.");
    }
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

    if (previousPosition) {
        const distance = calcularDistancia(previousPosition.latitude, previousPosition.longitude, latitude, longitude);
        totalDistance += distance;
    }

    previousPosition = { latitude, longitude };
    distanciaPercorridaElement.textContent = totalDistance.toFixed(2) + ' km';

    atualizarGrafico(timestamp);
    atualizarMapaComNovaCoordenada(latitude, longitude);

    // Opcional: Enviar dados para o servidor Node.js
    // enviarDadosParaServidor({ latitude, longitude, timestamp, distance: distance - (previousDistance || 0) });
    // previousDistance = distance;
}

function tratarErro(error) {
    console.warn('Erro ao obter localização:', error.message);
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

function atualizarGrafico(timestamp) {
    distanceData.push(totalDistance);
    timeData.push(new Date(timestamp));

    meuGrafico.data.labels = timeData;
    meuGrafico.data.datasets[0].data = distanceData;
    meuGrafico.update();
}

function inicializarMapa() {
    mapa = L.map('mapa-container').setView([-20.0, -45.0], 13); // Coordenadas genéricas
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapa);
}

function desenharRotaNoMapa() {
    if (mapa && pathCoordinates.length > 1) {
        if (polyline) {
            mapa.removeLayer(polyline);
        }
        polyline = L.polyline(pathCoordinates, { color: 'blue' }).addTo(mapa);
        mapa.fitBounds(polyline.getBounds());
    } else if (mapa && pathCoordinates.length === 1) {
        mapa.setView(pathCoordinates[0], 15); // Centralizar no ponto inicial se houver apenas um ponto
    }
}

function atualizarMapaComNovaCoordenada(latitude, longitude) {
    if (mapa) {
        if (!polyline) {
            polyline = L.polyline([pathCoordinates[pathCoordinates.length - 1]], { color: 'blue' }).addTo(mapa);
        } else {
            polyline.addLatLng([latitude, longitude]);
        }
        // Opcional: Centralizar o mapa na última localização
        // mapa.setView([latitude, longitude], 15);
    }
}

// Opcional: Função para enviar dados para o servidor Node.js
// async function enviarDadosParaServidor(data) {
//     try {
//         const response = await fetch('/api/location', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(data),
//         });
//         if (!response.ok) {
//             console.error('Erro ao enviar dados para o servidor:', response.status);
//         }
//     } catch (error) {
//         console.error('Erro ao enviar dados para o servidor:', error);
//     }
// }

iniciarCaminhadaBotao.addEventListener('click', iniciarCaminhada);
pararCaminhadaBotao.addEventListener('click', pararCaminhada);