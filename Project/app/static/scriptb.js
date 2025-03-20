let ws;
let isAnalyzing = true;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false; // Estado para controlar la grabación
let path = 'http://127.0.0.1';

const emotionData = {};
const labels = [];
const emotionCounts = [];

const pauseButton = document.getElementById('toggle-btn');
const saveButton = document.getElementById('saveButton');
const saveButton2 = document.getElementById('saveButton2');

const startButton = document.getElementById('startanalisis');
const startButton2 = document.getElementById('startButton2');

const playButton = document.getElementById('videoUpload')
const playanButton = document.getElementById('analyzeVideoBtn')
const ReportsButton = document.getElementById('ReportsButton')
const patient_name = document.getElementById('patientName')

patient_name.style.display = 'none'
saveButton.disabled = true;
pauseButton.disabled = true;

saveButton.style.display = 'none'
saveButton2.style.display = 'none'
pauseButton.style.display = 'none'
startButton2.style.display = 'none'

playButton.disabled = true;
playButton.style.display = 'none'

let emotionChart, emotionScatterChart, emotionPolarChart; // Variables globales para los gráficos

function goBackToIndex() {
    // Redirigir a index2.html
    window.location.href = "/";
}

// Inicializar el gráfico cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    initializeCharts(); // Inicializar gráficos
});

function initializeCharts() {
    const ctx = document.getElementById("emotionChart").getContext("2d");
    const scatterCtx = document.getElementById("emotionScatterChart").getContext("2d");
    const polarCtx = document.getElementById("emotionPolarChart").getContext("2d");

    const emotionMap = {
        Enojo: 7,
        Miedo: 6,
        Tristeza: 5,
        Neutral: 4,
        Desagrado: 3,
        Felicidad: 2,
        Sorpresa: 1,
        Desconocida: 0
    };

    const labels = [];
    const emotionValues = [];
    const percentageValues = [];

    const scatterData = {
        datasets: [{
            label: "Emociones detectadas",
            data: [],
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
        }],
    };

    const scatterOptions = {
        responsive: true,
        animation: false,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const emotionMap = {
                            0: "Desconocida",
                            1: "Sorpresa",
                            2: "Felicidad",
                            3: "Desagrado",
                            4: "Neutral",
                            5: "Tristeza",
                            6: "Miedo",
                            7: "Enojo"
                        };
                        const emotionLabel = emotionMap[context.raw.x] || "Desconocida";
                        return `Emoción: ${emotionLabel}, Porcentaje: ${context.raw.y}%, Personas: ${context.raw.r}`;
                    },
                },
            },
        },
        scales: {
            x: {
                title: { display: true, text: "Emoción" },
                ticks: {
                    callback: function(value) {
                        const emotionMap = {
                            0: "Desconocida",
                            1: "Sorpresa",
                            2: "Felicidad",
                            3: "Desagrado",
                            4: "Neutral",
                            5: "Tristeza",
                            6: "Miedo",
                            7: "Enojo"
                        };
                        return emotionMap[value] || "";
                    },
                    stepSize: 1,
                },
                min: 0,
                max: 7,
            },
            y: {
                title: { display: true, text: "Porcentaje (%)" },
                min: 0,
                max: 100,
            },
        },
    };

    emotionScatterChart = new Chart(scatterCtx, {
        type: "scatter",
        data: scatterData,
        options: scatterOptions,
    });

    emotionPolarChart = new Chart(polarCtx, {
        type: 'polarArea',
        data: {
            labels: [
                'Enojo',
                'Desagrado',
                'Miedo',
                'Felicidad',
                'Tristeza',
                'Sorpresa',
                'Neutral',
            ],
            datasets: [{
                label: 'Intensidad de emociones',
                data: [40, 20, 15, 25, 35, 18, 5],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(255, 159, 64, 0.5)',
                    'rgba(255, 205, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                    'rgba(201, 203, 207, 0.5)',
                ]
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    ticks: { display: false },
                }
            },
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });

    emotionChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Emoción detectada",
                    data: emotionValues,
                    borderColor: "rgb(75, 192, 192)",
                    backgroundColor: "rgba(75, 192, 192, 0.2)",
                    borderWidth: 2,
                    tension: 0.4,
                },
                {
                    label: "Porcentaje de detección",
                    data: percentageValues,
                    borderColor: "rgb(255, 159, 64)",
                    backgroundColor: "rgba(255, 159, 64, 0.2)",
                    tension: 0.4,
                    borderWidth: 2,
                    yAxisID: 'y1',
                },
            ],
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: {
                    title: { display: true, text: "Tiempo (s)" },
                },
                y: {
                    title: { display: true, text: "Emoción" },
                    ticks: {
                        callback: function(value) {
                            return Object.keys(emotionMap).find(key => emotionMap[key] === value);
                        },
                        stepSize: 1,
                    },
                    min: 0,
                    max: 7,
                },
                y1: {
                    position: 'right',
                    title: { display: true, text: "Porcentaje (%)" },
                    ticks: {
                        min: 0,
                        max: 100,
                        stepSize: 10
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                },
            },
        },
    });
}

function startWebSocket() {
    ws = new WebSocket("ws://127.0.0.1:8000/ws");

    ws.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data.emotion) {
            document.querySelector("#emotion").innerText = "Emoción detectada: " + data.emotion;

            if (data.percentage) {
                document.querySelector("#percentage").innerText = "Porcentaje: " + data.percentage + "%";
            }

            if (data.NumeroPersonas) {
                document.querySelector("#NumeroPersonas").innerText = "Personas Detectadas: " + data.NumeroPersonas;
            }

            if (data.Tiempo) {
                document.querySelector("#endan").innerText = "Tiempo Transcurrido: " + data.Tiempo;
            }

            const currentTime = new Date().toLocaleTimeString();
            updateChart(data.emotion, currentTime, data.percentage, data.NumeroPersonas);
            updateScatterChart(data.emotion, data.percentage, data.NumeroPersonas);
            updatePolarChart(data.emociones);
        }
    };

    ws.onclose = () => console.error("WebSocket cerrado. Intenta reconectarte.");
    ws.onerror = error => console.error("Error en WebSocket:", error);
}

function updateChart(emotion, timestamp, percentage) {
    const emotionMap = {
        Enojo: 7,
        Miedo: 6,
        Tristeza: 5,
        Neutral: 4,
        Desagrado: 3,
        Felicidad: 2,
        Sorpresa: 1,
        Desconocida: 0
    };

    if (!emotionChart.data.labels.includes(timestamp)) {
        emotionChart.data.labels.push(timestamp);
        if (emotionChart.data.labels.length > 30) emotionChart.data.labels.shift();
    }

    const emotionValue = emotionMap[emotion] ?? null;
    if (emotionValue !== null) {
        emotionChart.data.datasets[0].data.push(emotionValue);
        if (emotionChart.data.datasets[0].data.length > 30) emotionChart.data.datasets[0].data.shift();
    }
    if (percentage !== null) {
        emotionChart.data.datasets[1].data.push(percentage);
        if (emotionChart.data.datasets[1].data.length > 30) emotionChart.data.datasets[1].data.shift();
    }
    emotionChart.update();
}

function updateScatterChart(emotion, percentage, personsDetected) {
    const emotionMap = {
        Enojo: 7,
        Miedo: 6,
        Tristeza: 5,
        Neutral: 4,
        Desagrado: 3,
        Felicidad: 2,
        Sorpresa: 1,
        Desconocida: 0,
    };

    const emotionValue = emotionMap[emotion] ?? null;
    if (emotionValue !== null) {
        emotionScatterChart.data.datasets[0].data.push({
            x: emotionValue,
            y: percentage,
            r: personsDetected ? personsDetected * 2 : 5,
        });

        emotionScatterChart.update();
    }
}

function updatePolarChart(emotion) {
    emotionPolarChart.data.datasets[0].data = emotion;
    emotionPolarChart.update();
}

function startStream() {
    startWebSocket(); // Iniciar WebSocket aquí

    const video = document.querySelector("#video");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    pauseButton.disabled = false;
    saveButton.disabled = false;

    startButton.disabled = true;
    startButton.style.display = 'none'
    startButton2.style.display = 'none'
    playanButton.style.display = "none";

    pauseButton.style.display = 'block';
    saveButton.style.display = 'block';
    saveButton2.style.display = 'block';
    ReportsButton.style.display = 'block';

    const placeholder = document.getElementById("placeholder");

    placeholder.style.display = "none";
    video.style.display = "block";

    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
        video.srcObject = stream;
        video.play();

        mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.start();

        if (!isAnalyzing && !isRecording) {
            toggleAnalysis()
        }

        isRecording = true;

        setInterval(() => {
            if (isAnalyzing) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const frame = canvas.toDataURL("image/jpeg");
                ws.send(frame);
            }
        }, 133);
    });
}

function playStream() {
    startWebSocket(); // Iniciar WebSocket aquí

    const videoUpload = document.getElementById("videoUpload");
    const uploadedVideo = document.getElementById("uploadedVideo");
    const videoCanvas = document.createElement("canvas");
    const ctx = videoCanvas.getContext("2d");

    startButton.style.display = 'none'
    playButton.style.display = 'block'
    playButton.disabled = false
    playanButton.style.display = 'none'
    pauseButton.style.display = 'block'
    saveButton.style.display = 'block'

    pauseButton.disabled = false
    saveButton.disabled = false

    const placeholder = document.getElementById("placeholder");

    placeholder.style.display = "none";
    uploadedVideo.style.display = "block";

    videoUpload.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const videoURL = URL.createObjectURL(file);
        uploadedVideo.src = videoURL;

        uploadedVideo.addEventListener("play", () => {
            const interval = setInterval(async () => {
                if (uploadedVideo.paused || uploadedVideo.ended) {
                    clearInterval(interval);
                    return;
                }

                videoCanvas.width = uploadedVideo.videoWidth;
                videoCanvas.height = uploadedVideo.videoHeight;
                ctx.drawImage(uploadedVideo, 0, 0, videoCanvas.width, videoCanvas.height);

                const frame = videoCanvas.toDataURL("image/jpeg");
                ws.send(frame);
            }, 133);
        });
    });
}

function toggleAnalysis() {
    isAnalyzing = !isAnalyzing;
    document.querySelector("#toggle-btn").innerText = isAnalyzing ? "Pausar" : "Reanudar";
    saveButton.disabled = false;

    const placeholder = document.getElementById("placeholder");
    const video = document.getElementById("video");

    if (isAnalyzing && !isRecording) {
        placeholder.style.display = "none";
        video.style.display = "block";
        isRecording = true;
    } else if (!isAnalyzing && isRecording) {
        patient_name.style.display = 'block'
        mediaRecorder.stop();
        isRecording = false;
        placeholder.style.display = "block";
        video.style.display = "none";
        pauseButton.style.display = 'none'

        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;

        if (ws) {
            ws.close(); // Cerrar WebSocket cuando se pausa
        }
    }
}

// Resto del código (stopRecording, stopRecordingR, fetchReports, viewReport) permanece igual