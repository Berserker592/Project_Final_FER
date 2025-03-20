let path = 'https://emotionvisia.com';

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const reportName = urlParams.get("report");
    
    if (!reportName) {
        alert("No se especificó ningún reporte.");
        return;
    }
    
    // Obtener datos del reporte
    fetch(`${path}/get-report/${reportName}`)
        .then(response => response.json())
        .then(data => {
            if (!data || data.length === 0) {
                alert("El reporte no contiene datos.");
                return;
            }

            document.querySelector("#Reportename").innerText = "REPORTE: " + reportName;
            // Procesar datos
            const emotions = data.map(entry => entry.emotion);
            const times = data.map(entry => entry.time);
            const abruptChanges = data.filter(entry => entry.abrupt_change).length;

            // Obtener emoción predominante
            const emotionCounts = emotions.reduce((acc, emotion) => {
                acc[emotion] = (acc[emotion] || 0) + 1;
                return acc;
            }, {});
            const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) =>
                emotionCounts[a] > emotionCounts[b] ? a : b
            );

            // Mostrar datos en la página
            document.getElementById("dominantEmotion").innerText = dominantEmotion;
            document.getElementById("abruptChanges").innerText = abruptChanges;

            // Crear gráfica de línea
            const ctx = document.getElementById("emotionChart").getContext("2d");
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
            const numericEmotions = emotions.map(emotion => emotionMap[emotion] || 0);

            new Chart(ctx, {
                type: "line",
                data: {
                    labels: times, // Eje X: tiempos
                    datasets: [{
                        label: "Emociones Registradas",
                        data: numericEmotions, // Eje Y: emociones numéricas
                        borderWidth: 3,
                        pointBackgroundColor: "black",
                        tension: 0.3, // Para suavizar las curvas
                    }]
                },
                options: {
                    responsive: true,
                    
                    plugins: {
                        tooltip: {
                            callbacks: {
                                // Mostrar la emoción original en el tooltip
                                label: function(context) {
                                    const index = context.dataIndex;
                                    return `Emoción: ${emotions[index]} (Valor: ${context.raw})`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: "Cantidad",
                            },
                            ticks: {
                                // Mostrar solo ciertos intervalos de tiempo
                                autoSkip: true, // Activar el salto automático de etiquetas
                                maxTicksLimit: 20, // Número máximo de etiquetas en el eje X
                                maxRotation: 0, // Evitar rotación de las etiquetas
                                callback: function(value, index, values) {
                                    // Mostrar solo cada 20 segundos (o el intervalo que desees)
                                    if (index % 20 === 0) {
                                        return value;
                                    }
                                    return null; // No mostrar otras etiquetas
                                }
                            },
                            grid: {
                                display: true, // Mostrar líneas de la cuadrícula
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: "Emoción",
                            },
                            ticks: {
                                // Mostrar etiquetas de las emociones en lugar de números
                                callback: function(value) {
                                    return Object.keys(emotionMap).find(key => emotionMap[key] === value) || "Desconocida";
                                }
                            },
                            beginAtZero: true,
                            max: 7, // Máximo nivel de emoción según el mapa
                        }
                    }
                }
            });

            // Crear gráfica de pastel
            const pieCtx = document.getElementById("emotionPieChart").getContext("2d");
            const emotionFrequency = emotions.reduce((acc, emotion) => {
                acc[emotion] = (acc[emotion] || 0) + 1;
                return acc;
            }, {});

            const pieData = {
                labels: Object.keys(emotionFrequency),
                datasets: [{
                    data: Object.values(emotionFrequency),
                    backgroundColor: [
                        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#E7E9ED"
                    ],
                    hoverOffset: 4,
                }]
            };

            new Chart(pieCtx, {
                type: "pie",
                data: pieData,
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: "bottom" },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || "";
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(2) + "%";
                                    return `${label}: ${value} (${percentage})`;
                                }
                            }
                        }
                    }
                }
            });

            // Mostrar porcentajes
            const totalEmotions = emotions.length;
            const emotionPercentages = Object.keys(emotionFrequency).map(emotion => {
                const percentage = ((emotionFrequency[emotion] / totalEmotions) * 100).toFixed(2);
                return `${emotion}: ${percentage}%`;
            });
            document.getElementById("emotionPercentages").innerHTML = emotionPercentages.join("<br>");

            // Mostrar línea de tiempo
            const timelineList = document.getElementById("timelineList");
            data.forEach(entry => {
                const listItem = document.createElement("li");
                listItem.textContent = `${entry.time}: ${entry.emotion}`;
                timelineList.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error("Error al obtener el reporte:", error);
           // alert("No se pudo cargar el reporte.");
        });
});

function goBackToIndex() {
    // Redirigir a index2.html
    window.location.href = "main.html";
}