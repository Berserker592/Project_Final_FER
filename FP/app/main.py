import os
import csv
import pytz
from datetime import datetime, timedelta
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, WebSocket, UploadFile, File, Form, WebSocketDisconnect

from Encryption.Token_decod import validation_token
from data_processing.Facial_Detect import Deteccion
from data_processing.Emotion_detect import emotion_analize

from routes.report_obtain import router as report_obtain
from routes.reports_list import router as report_list
from routes.auth import validatetoken

app = FastAPI()

app.include_router(report_obtain, prefix="")
app.include_router(report_list,prefix="")
app.include_router(validatetoken,prefix="")

#Montar la carpeta de archivos esenciales
#Local
app.mount("/static", StaticFiles(directory="/app/static"), name="static")
app.mount("/Reportes", StaticFiles(directory="/app/Archivos/Reportes"), name="Reportes")
app.mount("/Videos", StaticFiles(directory="/app/Archivos/Videos"), name="Videos")


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
    return FileResponse("/app/static/index.html")

# Crear carpeta para reportes y videos
#os.makedirs("Archivos/Reportes", exist_ok=True)
#os.makedirs("Archivos/Videos", exist_ok=True)


# Variables globales para gestionar el análisis
analyzing = True
emotion_log = [] 
features = []#Cantidad de personas en la imagen
zh_ecuador = pytz.timezone('America/Guayaquil')


# WebSocket para procesar frames en tiempo real
@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    global analyzing, emotion_log,start_an
    #start_an = time_start()
    #end_an = time_end()
    start_an = datetime.now(zh_ecuador)
    time_end = start_an + timedelta(minutes=50)
    
    validation_result = validation_token(token,ouput=True)

    # Si el token es inválido, enviamos el mensaje de error y cerramos la conexión
    if not validation_result["valid"]:
        await websocket.close()
        return
    else:
        emotion_log = []
        await websocket.accept()
    

    while True:
        try:
            global face_location
            
            # Recibir frame en base64
            frame_data = await websocket.receive_bytes()
            
            #Modulo de deteccion de rostros
            N_personas, faces_roi, Ubicacion = await Deteccion(frame_data)          
           
            if N_personas == '1':
                
                # Modulo de deteccion de emociones 
                percentage, emotion, emociones = await emotion_analize(faces_roi)
                #emotion_log.append({"time": timestamp2(), "emotion": emotion})              
                emotion_log.append({"time": datetime.now(zh_ecuador).strftime("%H:%M:%S.%f"), "emotion": emotion})            
            else:
                emotion = 'Desconocida'
                percentage = '0'
                emociones = [0,0,0,0,0,0,0]
            end_an = datetime.now(zh_ecuador)
            
            if end_an > time_end:
                print('Tiempo maximo de conexion')
                await websocket.close()
                
            tiempo = str(end_an-start_an)
            #tiempo = time_elapsed(start_an)
            data_to_send = {'emotion':emotion,
                           'percentage':percentage,
                           "NumeroPersonas":N_personas,
                           'Tiempo':tiempo,
                           'emociones':emociones}   
            
            #Envio de los resultados al cliente
            await websocket.send_json(data_to_send)
                           
        except WebSocketDisconnect:
            print('Cliente Desconectado')
            break

        except Exception as e:
            print(f"Error en WebSocket: {e}")
            break
    

def analyze_emotions(emotion_log):
    analyzed_log = []
    last_emotion = None
    last_time = None
    abrupt_changes = 0

    for entry in emotion_log:
        time = datetime.strptime(entry["time"], "%H:%M:%S.%f")
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


# Endpoint para guardar análisis y reporte
@app.post("/save-analysis/")
async def save_analysis(
    video: UploadFile = File(...),
    patient_name: str = Form(...)
    ):
    
    global emotion_log,end_an
    
    Input_Name = patient_name.replace(" ", "_").replace("/", "_")  # Asegúrate de que el nombre sea válido para un archivo
    
    if not patient_name.strip():
        return {"message": "El nombre del paciente no puede estar vacío"}

    #timestamp1 = timestamp()
    timestamp = datetime.now(zh_ecuador).strftime("%Y%m%d_%H:%M:%S")
    
    report_path = f"/app/Archivos/Reportes/RP_{Input_Name}_{timestamp}.csv"
    video_path = f"/app/Archivos/Videos/VD_{Input_Name}_{timestamp}.webm"
    
    #video_path = f"Videos/{video.filename}"#captured_video.webm
    
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
    
    #timestamp1 = timestamp()
    timestamp = datetime.now(zh_ecuador).strftime("%Y%m%d_%H%M%S")
    
    report_path = f"/app/Archivos/Reportes/RP_{Input_Name}_{timestamp}.csv"
    
    #video_path = f"Videos/{video.filename}"#captured_video.webm
    
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




##Endpoint para enlistar los reportes almacenados
#@app.get("/list-reports/")
#async def list_reports():
#    reports = os.listdir("Archivos/Reportes/")
#    videos = os.listdir("Archivos/Videos/")
#    return {"reports": reports, "videos": videos}
#
#
## Ruta donde se almacenan los reportes
#REPORTS_DIR = Path("Archivos/Reportes")
#
##Endpoint para acceder a cada uno de los reportes
#@app.get("/get-report/{report_name}")
#async def get_report(report_name: str):
#    report_path = REPORTS_DIR / report_name
#    if not report_path.exists():
#        return JSONResponse(status_code=404, content={"message": "Reporte no encontrado"})
#
#    # Leer el archivo CSV y convertirlo a JSON
#    df = pd.read_csv(report_path)
#    return df.to_dict(orient="records")