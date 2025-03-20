import asyncio
from datetime import datetime
from fastapi.templating import Jinja2Templates
from app.Encryption.Token_decod import validation_token
from app.routes.save_report import recuperacion_log
from app.functions.time_generate import time_start, time_end, time_elapsed
from app.data_processing.Facial_Detect import Deteccion
from app.functions.files_backups import backup_save_analysis
from app.data_processing.Emotion_detect import emotion_analize
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import numpy as np
import cv2

# Variables globales para gestionar el análisis
analyzing = True
features = []#Cantidad de personas en la imagen


templates = Jinja2Templates(directory="static") 

routerws = APIRouter()

# WebSocket para procesar frames en tiempo real
@routerws.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    global analyzing,start_an
    #start_an = datetime.now()
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
    # Iniciar el proceso en segundo plano solo una vez


    while True:
        try:            
            # Recibir frame en base64
            frame_data = await websocket.receive_bytes()
            
            # Modulo deteccion facial
            N_personas, faces_roi, Ubicacion = await Deteccion(frame_data)
            
            if analyzing and N_personas == '1':
                
                # Modulo deteccion de emociones 
                percentage, emotion, emociones = await emotion_analize(faces_roi)
                
                #emotion_log.append({"time": datetime.now().isoformat(), "emotion": emotion})
            else:
                emotion = 'Desconocida'
                percentage = '0'
                emociones = [0,0,0,0,0,0,0]

            recuperacion_log({"time": datetime.now().isoformat(), "emotion": emotion})
            time = str(time_elapsed(start_an))

            data_to_send = {'emotion':emotion,
                           'percentage':percentage,
                           "NumeroPersonas":N_personas,
                           'Tiempo':time,
                           'emociones':emociones}   
            await websocket.send_json(data_to_send)
            
            if time_start() > end_an:
                await websocket.close() 
                await backup_save_analysis()
 
        except WebSocketDisconnect:
            print('Cliente Desconectado. Guardando Reporte.....')
            #save_analysis("Archivo_Recuperado")
            break

        except Exception as e:
            print(f"Error en WebSocket: {e}")
            break
    
