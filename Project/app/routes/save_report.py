import os
import csv
from datetime import datetime
from app.functions.path import path_ret
from app.functions.time_generate import timestamp
from fastapi import APIRouter, Form, UploadFile, Form, File

save_analysis_router = APIRouter()
save_analysis2_router = APIRouter()

emotion_log = []
path = path_ret()

def recuperacion_log(variable):
    emotion_log.append(variable)

#New Code
def analyze_emotions(emotion_log):
    analyzed_log = []
    last_emotion = None
    last_time = None
    abrupt_changes = 0

    for entry in emotion_log:
        time = datetime.strptime(entry["time"], "%Y-%m-%dT%H:%M:%S.%f")
        #time = datetime.strptime(entry["time"], "%H:%M:%S")
        emotion = entry["emotion"]
        
        # Detectar cambios abruptos de emoción
        abrupt_change = False
        if last_emotion and emotion != last_emotion:
            abrupt_change = True
            abrupt_changes += 1
        
        # Calcular duración entre registros
        duration = (time - last_time).total_seconds() if last_time else 0
        
        analyzed_log.append({
            "time": entry["time"],
            "emotion": emotion,
            "duration_since_last": duration,
            "abrupt_change": abrupt_change,
        })
        
        last_emotion = emotion
        last_time = time
    
    return analyzed_log, abrupt_changes

# Ruta para guardar análisis y reporte
@save_analysis2_router.post("/save-analysis/")
async def save_analysis(
    video: UploadFile = File(...),
    patient_name: str = Form(...),
    ):
    
    global emotion_log 
    
    Input_Name = patient_name.replace(" ", "_").replace("/", "_")  # Asegúrate de que el nombre sea válido para un archivo
    
    if not patient_name.strip():
        return {"message": "El nombre del paciente no puede estar vacío"}
 
    report_path = f"{path}Archivos/Reportes/RP_{Input_Name}_{timestamp()}.csv"
    video_path = f"{path}Archivos/Videos/VD_{Input_Name}_{timestamp()}.webm"
    
    
    if not emotion_log:
        return {"message": "No hay datos para guardar"}
    
    analyzed_log, abrupt_changes = analyze_emotions(emotion_log)

    # Guardar reporte en CSV
    with open(report_path, mode="w", newline="") as file:
        writer = csv.DictWriter(
            file, 
            fieldnames=["time", "emotion", "duration_since_last", "abrupt_change"]
        )
        writer.writeheader()
        writer.writerows(analyzed_log)
        #generate_emotion_graph(report_path, analyzed_log)   
    
    
    #Guardar video en webm
    try:
        file_content = await video.read()
        #print(f"Tipo de contenido: {video.content_type}")
        #print(f"El archivo recibido tiene {len(file_content)} bytes")
        
        if os.path.exists(video_path):
            #print(f'la ruta existente sera: {video_path}')
            with open(video_path, "wb") as f:
                f.write(file_content)
                
            emotion_log = []  # Limpiar el log después de guardar
        else:
            with open(video_path, "wb") as f:
                f.write(file_content)
            #print(f'la ruta no existente sera: {video_path}')
                
            #return {"message": f"Video guardado en {video_path}"}
        emotion_log = []  # Limpiar el log después de guardar
                 
        return {"message": f"Reporte guardado en {report_path}, Video guardado en {video_path}"}
        
    except Exception as e:
        return {"message": f"Error al guardar el video: {str(e)}"}   


# Endpoint para guardar reporte
@save_analysis_router.post("/save-analysis-report/")
async def save_analysis(patient_name: str = Form(...)):
    global emotion_log  # Accedemos a la variable global

    Input_Name = patient_name.replace(" ", "_").replace("/", "_")  # Evitar caracteres no válidos
    
    if not patient_name.strip():
        return {"message": "El nombre del paciente no puede estar vacío"}

    report_path = f"{path}Archivos/Reportes/RP_{Input_Name}_{timestamp()}.csv"

    if not emotion_log:
        return {"message": "No hay datos para guardar"}
    
    analyzed_log, abrupt_changes = analyze_emotions(emotion_log)

    # Guardar reporte en CSV
    try:
        with open(report_path, mode="w", newline="") as file:
            writer = csv.DictWriter(
                file, 
                fieldnames=["time", "emotion", "duration_since_last", "abrupt_change"]
            )
            writer.writeheader()
            writer.writerows(analyzed_log)
            emotion_log.clear()  # Limpiar la lista después de guardar
                     
            return {"message": f"Reporte guardado en {report_path}"}
        
    except Exception as e:
        return {"message": f"Error al guardar el reporte: {str(e)}"}
