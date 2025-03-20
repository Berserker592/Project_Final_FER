import os
import csv
import asyncio 
import subprocess
import pandas as pd
from fastapi import FastAPI
from pathlib import Path
from datetime import datetime
import matplotlib.pyplot as plt
from starlette.requests import Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from concurrent.futures import ThreadPoolExecutor
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi import FastAPI, WebSocket, UploadFile, File, Form, WebSocketDisconnect
from app.data_processing.Facial_Detect import Deteccion
from app.data_processing.Emotion_detect import emotion_analize

from app.routes.report_obtain import router as report_obtain
from app.routes.reports_list import router as report_list
from app.routes.auth import validatetoken
from app.functions.time_generate import time_start, time_end, time_elapsed, timestamp, timestamp2
from app.Encryption.Token_decod import validation_token

app = FastAPI()

app.include_router(report_obtain, prefix="")
app.include_router(report_list,prefix="")
app.include_router(validatetoken,prefix="")

#Montar la carpeta de archivos esenciales
# CORS y rutas estáticas

#Servidor /
#Local
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.mount("/Reportes", StaticFiles(directory="app/Archivos/Reportes"), name="Reportes")
app.mount("/Videos", StaticFiles(directory="app/Archivos/Videos"), name="Videos")

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Permitir solicitudes de cualquier origen.
    allow_credentials=True,     # Permitir el uso de cookies y autenticación.
    allow_methods=["*"],        # Permitir cualquier método HTTP (GET, POST, PUT, etc.).
    allow_headers=["*"],        # Permitir cualquier cabecera HTTP personalizada.
)

@app.get("/")
def get_frontend():
    return FileResponse("app/static/index.html")

# Variables globales para gestionar el análisis
analyzing = True
emotion_log = [] 
features = []#Cantidad de personas en la imagen
templates = Jinja2Templates(directory="static") 


# WebSocket para procesar frames en tiempo real
@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    global analyzing, emotion_log,start_an
    start_an = time_start()
    end_an = time_end()
    
    validation_result = validation_token(token,ouput=True)

    # Si el token es inválido, enviamos el mensaje de error y cerramos la conexión
    if not validation_result["valid"]:
        await websocket.close()
        return
    else:
        await websocket.accept()
    
    async def keep_alive():
        """Envia un mensaje vacío cada 30 segundos para mantener la conexión viva"""
        while True:
            await asyncio.sleep(30)  # Intervalo de 30 segundos
            try:
                await websocket.send_text("")  # Mantiene la conexión activa
            except:
                break  # Si falla, termina el loop
    
    asyncio.create_task(keep_alive())  # Inicia el keep-alive en segundo plano

    while True:
        try:
            global face_location
            
            # Recibir frame en base64 o bytes
            frame_data = await websocket.receive_bytes()
 
            # Detectar el rostro en caso de encontrarse
            N_personas, faces_roi, Ubicacion = await Deteccion(frame_data)

            #if analyzing and N_personas == '1':
            if analyzing:
            
                # Modulo deteccion de emociones
                percentage, emotion, emociones = await emotion_analize(faces_roi)
                emotion_log.append({"time": timestamp2(), "emotion": emotion})              
            else:
                emotion = 'Desconocida'
                percentage = '0'
                emociones = [0,0,0,0,0,0,0]
            
            end_an = datetime.now()
            tiempo = str(end_an-start_an)
            #time_elapsed(start_an)
            data_to_send = {'emotion':emotion,
                           'percentage':percentage,
                           "NumeroPersonas":N_personas,
                           'Tiempo':tiempo,
                           'emociones':emociones}   
            
            await websocket.send_json(data_to_send)
            
        except WebSocketDisconnect:
            break

        except Exception as e:
            print(f"Error en WebSocket: {e}")
            break
    
    #await websocket.close()


#Funcion para los datos
def analyze_emotions(emotion_log):
    analyzed_log = []
    last_emotion = None
    last_time = None
    abrupt_changes = 0

    for entry in emotion_log:
        
        time = datetime.strptime(entry["time"], "%Y-%m-%dT%H:%M:%S.%f")
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
@app.post("/save-analysis/")
async def save_analysis(
    video: UploadFile = File(...),
    patient_name: str = Form(...)
    ):
    
    global emotion_log,end_an
    
    Input_Name = patient_name.replace(" ", "_").replace("/", "_")  # Asegúrate de que el nombre sea válido para un archivo
    
    if not patient_name.strip():
        return {"message": "El nombre del paciente no puede estar vacío"}
    
    timestamp1 = datetime.now().strftime("%d_%m_%Y")   
    
    report_path = f"app/Archivos/Reportes/RP_{Input_Name}_{timestamp1}.csv"
    video_path = f"app/Archivos/Videos/VD_{Input_Name}_{timestamp1}.webm"
        
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
        
    #Guardar video en webm
    try:
        file_content = await video.read()
        
        if os.path.exists(video_path):
            with open(video_path, "wb") as f:
                f.write(file_content)
                
            emotion_log = []  # Limpiar el log después de guardar
        else:
            with open(video_path, "wb") as f:
                f.write(file_content)
                
        emotion_log = []  # Limpiar el log después de guardar
                 
        return {"message": f"Reporte guardado en {report_path}, Video guardado en {video_path}"}
        
    except Exception as e:
        return {"message": f"Error al guardar el video: {str(e)}"}   

# Endpoint para guardar análisis y reporte
@app.post("/save-analysis-report/")
async def save_analysis(
    patient_name: str = Form(...)
    ):
    global emotion_log
    
    Input_Name = patient_name.replace(" ", "_").replace("/", "_")  # Asegúrate de que el nombre sea válido para un archivo
    
    if not patient_name.strip():
        return {"message": "El nombre del paciente no puede estar vacío"}  
    
    timestamp1 = datetime.now().strftime("%d_%m_%Y")   
    
    report_path = f"app/Archivos/Reportes/RP_{Input_Name}_{timestamp1}.csv"
        
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
            emotion_log = []  # Limpiar el log después de guardar
                     
            return {"message": f"Reporte guardado en {report_path}"}
        
    except Exception as e:
        return {"message": f"Error al guardar el reporte: {str(e)}"}   

