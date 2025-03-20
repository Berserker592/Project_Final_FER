let ws;
let isAnalyzing = true;
let isWsConnected = false;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false; // Estado para controlar la grabación
let emotionChart, emotionScatterChart, emotionPolarChart; // Variables globales para los gráficos

let path = 'https://emotionvisia.com';
let path2 = 'emotionvisia.com';


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


saveButton.disabled = true;
pauseButton.disabled = true;
playButton.disabled = true;

patient_name.style.display = 'none'
saveButton.style.display = 'none'
saveButton2.style.display = 'none'
pauseButton.style.display = 'none'
startButton2.style.display = 'none'
playButton.style.display = 'none'

function goBackToIndex() {
    // Redirigir a index2.html
    window.location.href = "/";
}
//Procesar video guardado

// Inicializar el gráfico cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    initializeCharts(); // Inicializar gráficos
});


function initializeCharts() {
    const ctx = document.getElementById("emotionChart").getContext("2d");
    const scatterCtx = document.getElementById("emotionScatterChart").getContext("2d");
    const polarCtx = document.getElementById("emotionPolarChart").getContext("2d");

    const scatterData = {
        datasets: [{
            label: "Emociones detectadas",
            data: [], // Aquí irán los puntos (x: emoción, y: porcentaje, r: tamaño del punto)
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
        }],
    };

    // Mapeo de emociones a valores en el eje Y
    const emotionMap = {
        Enojo: 7,
        Miedo: 6,
        Tristeza: 5,
        Neutral: 4,
        Desagrado: 3,
        Felicidad: 2,
        Sorpresa: 1,
        Desconocida:0
    };

    const labels = []; // Eje X: tiempo
    const emotionValues = []; // Valores en el eje Y según la emoción detectada
    const percentageValues = []


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
                data: [40, 20, 15, 25, 35, 18, 5], // // Datos iniciales (serán actualizados por WebSocket) Ejemplo de datos
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)', // Angry
                    'rgba(255, 159, 64, 0.5)', // Fear
                    'rgba(255, 205, 86, 0.5)', // Surprise
                    'rgba(75, 192, 192, 0.5)', // Excited
                    'rgba(54, 162, 235, 0.5)', // Happy
                    'rgba(153, 102, 255, 0.5)', // Relaxed
                    'rgba(201, 203, 207, 0.5)', // Sleepy
                ]
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    ticks: { display: false }, // Ocultar etiquetas de escala
                }
            },
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });    

    

    // Simular datos dinámicos desde el WebSocket
    //setInterval(() => {
    //    const simulatedData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 100));
    //    updatePolarChart(simulatedData);
    //}, 5000); // Actualiza cada 5 segundos

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
                tension: 0.4, // Suavizar la línea para una apariencia continua
            },
            {
                label: "Porcentaje de detección",
                data: percentageValues,
                borderColor: "rgb(255, 159, 64)",
                backgroundColor: "rgba(255, 159, 64, 0.2)",
                tension: 0.4,
                borderWidth: 2,
                yAxisID: 'y1', // Usar el segundo eje Y para el porcentaje
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
                            // Mostrar etiquetas de emociones en el eje Y
                            return Object.keys(emotionMap).find(key => emotionMap[key] === value);
                        },
                        stepSize: 1, // Asegurar que cada emoción esté representada
                    },
                    min: 0,
                    max: 7,
                },
                y1: {
                    position: 'right',
                    title: { display: true, text: "Porcentaje (%)" },
                    ticks: {
                        min:0,
                        max: 100,
                        stepSize:10
                    },
                    grid: {
                        drawOnChartArea: false, // No dibujar la cuadrícula para el eje de porcentaje              

                    },
                },        
            },
        },
    });

    //if ("serviceWorker" in navigator) {
    //    navigator.serviceWorker.register("/static/service-worker.js")
    //        .then(registration => console.log("Service Worker registrado"))
    //        .catch(error => console.error("Error registrando Service Worker:", error));
    //}
}

function startWebSocket() {
    const token = document.getElementById('tokenInput').value;
    
    ws = new WebSocket(`wss://${path2}/ws/${token}`);
    isWsConnected = true;
    
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
    ws.onclose = () => {
        console.error("WebSocket cerrado. Intenta reconectarte.");
        isAnalyzing = false;
        isWsConnected = false;
        if (isRecording) {
            backupws()
        }
    };
    ws.onerror = (error) => {
        console.error("Error en WebSocket:", error);
        isAnalyzing = false;
        isWsConnected = false;
    };
}




    // Actualizar datos del gráfico de dispersión
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
            r: personsDetected ? personsDetected * 2 : 5, // Tamaño del punto
        });

        //if (emotionScatterChart.data.datasets[0].data.length > 30) {
        //    emotionScatterChart.data.datasets[0].data.shift(); // Limitar la cantidad de puntos
        //}

        emotionScatterChart.update();
    }
}


function updateChart(emotion, timestamp, percentage) {

    // Mapeo de emociones a valores en el eje Y
    const emotionMap = {
        Enojo: 7,
        Miedo: 6,
        Tristeza: 5,
        Neutral: 4,
        Desagrado: 3,
        Felicidad: 2,
        Sorpresa: 1,
        Desconocida:0
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


// Actualización dinámica del gráfico polar
function updatePolarChart(emotion) {
    emotionPolarChart.data.datasets[0].data = emotion;
    emotionPolarChart.update();
}



// Función para iniciar la transmisión de video y análisis
function startStream() {

    const token = document.getElementById('tokenInput').value;
        
    if (!token) {
        alert("Por favor, Ingresa primero el token.");
        return;
    }

    validationtoken()
    startWebSocket();

    // Esperar a que WebSocket se conecte antes de continuar
    setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
            console.error("No se pudo abrir la conexión WebSocket.");
            return;  // No continuar si WebSocket no está conectado
        }
        console.log('Conexion Websocket abierta')
    
        const video = document.querySelector("#video");
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        pauseButton.disabled = false;
        saveButton.disabled = false;
        
        startButton.disabled = true;
        startButton.style.display = 'none'
        startButton2.style.display = 'block'
        playanButton.style.display = "none";
    
        pauseButton.style.display = 'block';
        saveButton.style.display = 'block';
        saveButton2.style.display = 'block';
        ReportsButton.style.display = 'block';

    
        const placeholder = document.getElementById("placeholder");
        //const video1 = document.getElementById("video");
    
        // Ocultar la imagen y mostrar el video
        placeholder.style.display = "none";
        video.style.display = "block";
    
        // Aquí puedes agregar lógica para iniciar la grabación
        console.log("Grabación iniciada");
    
        navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
            video.srcObject = stream;
            video.play();
    
            // Configuración de grabación
            mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
    
            // Iniciar grabación
            mediaRecorder.start();
            
            //if (!isAnalyzing && !isRecording) {
            //    toggleAnalysis()
            //} 
            
            isRecording = true;
            console.log("Grabación iniciada");
            //alert('Grabacion Iniciada');
    
            // Procesamiento de video para análisis
            setInterval(() => {
                if (isAnalyzing || isWsConnected) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
                    canvas.toBlob((blob) => {
                        ws.send(blob);
                    }, "image/jpeg", 0.5);

                    //const frame = canvas.toDataURL("image/jpeg");
                    //ws.send(frame);
                }
                
            },133); // Enviar frames cada 200ms
        });
    },500);
}

//No Utilizado todavia
function startNewAnalysis() {
    window.location.href = "main.html";
}

function playStream(){
    const token = document.getElementById('tokenInput').value;
        
    if (!token) {
        alert("Por favor, Ingresa primero el token.");
        return;
    }

    validationtoken();
    startWebSocket();

    setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
            console.error("No se pudo abrir la conexión WebSocket.");
            return;
        }

        const videoUpload = document.getElementById("videoUpload");
        const uploadedVideo = document.getElementById("uploadedVideo");
        const videoCanvas = document.createElement("canvas");
        const ctx = videoCanvas.getContext("2d");

        startButton.style.display = 'none';
        playButton.style.display = 'block';
        playButton.disabled = false;
        playanButton.style.display = 'none';
        pauseButton.style.display = 'none';
        saveButton.style.display = 'none';
        startButton2.style.display = 'block';

        pauseButton.disabled = false;
        saveButton.disabled = false;

        const placeholder = document.getElementById("placeholder");
        placeholder.style.display = "none";
        uploadedVideo.style.display = "block";

        console.log("Esperando carga de video...");

        videoUpload.addEventListener("change", async (event) => {
            console.log("Video Subido");
            
            const file = event.target.files[0];
            if (!file) return;

            const videoURL = URL.createObjectURL(file);
            uploadedVideo.src = videoURL;

            uploadedVideo.onloadeddata = () => {
                console.log("Video cargado correctamente.");
            };

            uploadedVideo.addEventListener("play", () => {
                console.log("Reproducción iniciada...");
                
                const interval = setInterval(async () => {
                    if (uploadedVideo.paused || uploadedVideo.ended) {
                        console.log("Video pausado o terminado, deteniendo transmisión.");
                        clearInterval(interval);
                        return;
                    }

                    videoCanvas.width = uploadedVideo.videoWidth;
                    videoCanvas.height = uploadedVideo.videoHeight;
                    ctx.drawImage(uploadedVideo, 0, 0, videoCanvas.width, videoCanvas.height);

                    if (ws.readyState === WebSocket.OPEN) {
                        videoCanvas.toBlob((blob) => {
                            ws.send(blob);
                        }, "image/jpeg", 0.5);
                    } else {
                        console.warn("WebSocket cerrado antes de enviar el frame.");
                        clearInterval(interval);
                    }
                    
                }, 133);
                
                uploadedVideo.addEventListener("ended", () => {
                    console.log("Video finalizado, cerrando transmisión.");
                    clearInterval(interval);
                    saveButton2.style.display = 'block'
                    patient_name.style.display = 'block'
                    isAnalyzing = false
                });
            });
        });
    }, 500);
}


// Función para validar el token
async function validationtoken() {
    const token = document.getElementById("tokenInput").value;

    if (!token.trim()) {
        document.getElementById("responseMessage").innerText = "⚠️ Por favor, ingrese un token.";
        return;
    }

    try {
        const response = await fetch(`${path}/validate-token/`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',  // Enviar datos como formulario URL codificado
            },
            body: `token=${encodeURIComponent(token)}`,
            //headers: { "Content-Type": "application/json" },
            //body: JSON.stringify({ token: token })
        });

        // Convertir la respuesta a JSON
        const data = await response.json();

        if (response.ok) {
            if (data.valid == true) {
            document.getElementById("responseMessage").innerText = `✅ ${data.message}`;
            localStorage.setItem("token", token); // Guarda el token

            }
            else{
            document.getElementById("responseMessage").innerText = `❌ ${data.message}`;
            }
        } else {
            document.getElementById("responseMessage").innerText = `❌ Error: ${'Token No Procesado'}`;
        }
    } catch (error) {
        document.getElementById("responseMessage").innerText = "❌ Error en la conexión.";
    }
}


// Alternar análisis sin detener grabación
function toggleAnalysis() {
    isAnalyzing = !isAnalyzing;
    document.querySelector("#toggle-btn").innerText = isAnalyzing ? "Pausar" : "Reanudar";
    saveButton.disabled = false;
    
    const placeholder = document.getElementById("placeholder");
    const video = document.getElementById("video");


    // Aquí puedes agregar lógica para detener la grabación
    console.log("Grabación detenida");

    if (isAnalyzing && !isRecording) {
        // Si el análisis se reanuda, reanudar la grabación si estaba detenida
        //mediaRecorder.start();
        
        // Mostrar la imagen y ocultar el video
        placeholder.style.display = "none";
        video.style.display = "block";
        isRecording = true;
        console.log("Grabación reanudada");
    } else if (!isAnalyzing && isRecording) {
        // Si el análisis se pausa, detener la grabación
        patient_name.style.display = 'block'
        mediaRecorder.stop();
        isRecording = false;
        // Mostrar la imagen y ocultar el video
        placeholder.style.display = "block";
        video.style.display = "none";
        pauseButton.style.display = 'none'
        //pauseButton.disabled = true;
        console.log("Grabación pausada");
    
        // Detener el flujo de la cámara (apagarla)
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null; // Detener el video

        // Cerrar la conexion ws

        if (isWsConnected ) {
            ws.close(); // Cerrar WebSocket cuando se pausa
            console.log("Conexion WebSocket Cerrada");
        }
        
    }

}

// Detener grabación y enviar datos
function stopRecording() {
    startButton.style.display = 'none'
    const patient_name = document.getElementById('patientName').value;
    const patient_name2 = document.getElementById('patientName');
    
    
    if (isAnalyzing) {
        alert("Por favor, primero pause la grabacion");
        return;
    }

    //Obligar al usuario a ingresar el nombre del paciente
    if (!patient_name) {
        alert("Por favor, Ingresa el nombre del paciente.");
        return;
    }

    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }

        const videoBlob = new Blob(recordedChunks, { type: "video/webm" });
        
        const formData = new FormData();
        formData.append("video", videoBlob, "captured_video.webm");
        formData.append("patient_name", patient_name);

        fetch(`${path}/save-analysis/`, {
            method: "POST",
            body: formData,
        })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                recordedChunks = [];
                patient_name2.style.display = 'none';
                startButton.style.display = 'none';
                startButton2.style.display = 'block';
                saveButton.style.display = 'none';
                saveButton2.style.display = 'none';

            });
    }


// Detener grabación y enviar datos
function stopRecordingR() {
    startButton.style.display = 'none'
    const patient_name = document.getElementById('patientName').value;
    const patient_name2 = document.getElementById('patientName');
    
    if (isAnalyzing) {
        alert("Por favor, primero pause la grabacion");
        return;
    }

    //Obligar al usuario a ingresar el nombre del paciente
    if (!patient_name) {
        alert("Por favor, Ingresa el nombre del paciente.");
        return;
    }

    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }

        const formData = new FormData();
        formData.append("patient_name", patient_name);

        fetch(`${path}/save-analysis-report/`, {
            method: "POST",
            body: formData,
        })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                recordedChunks = [];
                patient_name2.style.display = 'none';
                startButton.style.display = 'none';
                startButton2.style.display = 'block';
                saveButton.style.display = 'none';
                saveButton2.style.display = 'none';
            });
    }

// funcion websocket cerrado
function backupws() {
    saveButton.style.display = "none"
    pauseButton.style.display = "none"
    saveButton2.style.display = "none"
    startButton2.style.display = 'block'
    mediaRecorder.stop();
    isRecording = false;
    // Mostrar la imagen y ocultar el video
    placeholder.style.display = "block";
    video.style.display = "none";
    pauseButton.style.display = 'none'
    //pauseButton.disabled = true;
    console.log("Grabación pausada");

    // Detener el flujo de la cámara (apagarla)
    const stream = video.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null; // Detener el video
    // Cerrar la conexion ws
    if (isWsConnected ) {
        ws.close(); // Cerrar WebSocket cuando se pausa
        console.log("Conexion WebSocket Cerrada");
    }

    const formData = new FormData();
    formData.append("patient_name", "AR");
    fetch(`${path}/save-analysis-report/`, {
        method: "POST",
        body: formData,
    })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            recordedChunks = [];
            startButton.style.display = 'none';
            startButton2.style.display = 'block';
            saveButton.style.display = 'none';
            saveButton2.style.display = 'none';
        });
    alert("Tiempo de conexion excedido.");

}
//Contemplacion de errores
//if (isRecording) {
//    toggleAnalysis()
//    console.log('Se cerro la conexion y se ejecuto la funcion')
//}

// Obtener reportes desde el servidor
function fetchReports() {
    fetch(`${path}/list-reports/`)
        .then(response => response.json())
        .then(data => {
            const videoColumn = document.querySelector("#video-column");
            const reportColumn = document.querySelector("#report-column");

            videoColumn.style.display = 'block'
            reportColumn.style.display = 'block'

            // Limpiar contenido previo
            videoColumn.innerHTML = "<h2>Videos</h2>";
            reportColumn.innerHTML = "<h2>Reportes</h2>";

            // Agregar videos a la columna izquierda
            data.videos.forEach(video => {
                const card = document.createElement("div");
                card.classList.add("card");
                card.innerHTML = `
                    <a href="${path}/Videos/${video}" target="_blank">${video}</a>
                `;
                videoColumn.appendChild(card);
            });

            // Agregar reportes a la columna derecha
            data.reports.forEach(report => {
                const card = document.createElement("div");
                card.classList.add("card");
                card.innerHTML = `
                   <a href="#" onclick="viewReport('${report}')">${report}</a>
                `;
                reportColumn.appendChild(card);
            });
        });

}


// Función para abrir la página de visualización del reporte
function viewReport(reportName) {
    window.location.href = `report_view.html?report=${reportName}`;
}

