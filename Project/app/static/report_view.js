let path = 'http://127.0.0.1';


document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const reportName = urlParams.get("report");

    if (!reportName) {
        alert("No se especificó ningún reporte.");
        return;
    }
    


    // Obtener datos del reporte
    fetch(`${path}:8000/get-report/${reportName}`)
        .then(response => response.json())
        .then(data => {
            if (!data || data.length === 0) {
                alert("El reporte no contiene datos.");
                return;
            }

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

            // Crear gráfica
            const ctx = document.getElementById("emotionChart").getContext("2d");
            
            // Mapa de emociones a valores numéricos
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
            
            // Convertir emociones a valores numéricos
            const numericEmotions = emotions.map(emotion => emotionMap[emotion] || 0);
            
            new Chart(ctx, {
                type: "line",
                data: {
                    labels: times, // Eje X: tiempos
                    datasets: [{
                        label: "Emoción a lo largo del tiempo",
                        data: numericEmotions, // Eje Y: emociones numéricas
                        //borderColor: "rgb(234, 239, 239)",
                        //backgroundColor: "rgb(255, 251, 251)",
                        //borderColor: "white",
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
                                text: "Tiempo",
                                //color: "white",
                            },
                            //grid: {
                            //    color: "rgba(255, 255, 255, 0.97)" // Líneas de la cuadrícula más suaves
                            //},
                            //ticks: {
                            //    color: "white", 
                            //},
                            },
                            
                        y: {
                            title: {
                                display: true,
                                text: "Nivel de Emoción",
                                //color: "white"
                            },
                            ticks: {
                                //color: "white", 
                                // Mostrar etiquetas de las emociones en lugar de números
                                callback: function(value) {
                                    return Object.keys(emotionMap).find(key => emotionMap[key] === value) || "Desconocida";
                                }
                            },
                            //grid: {
                            //    color: "rgb(255, 255, 255)" // Líneas de la cuadrícula más suaves
                            //},
                            beginAtZero: true,
                            max: 7, // Máximo nivel de emoción según el mapa
                        }
                    }
                }
            });

        })
        .catch(error => {
            console.error("Error al obtener el reporte:", error);
            alert("No se pudo cargar el reporte.");
        });
        
});

function goBackToIndex() {
    // Redirigir a index2.html
    window.location.href = "index2.html";
}