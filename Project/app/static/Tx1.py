



#TX1 
# Inicializa la cámara
picam2 = Picamera2()
picam2.configure(picam2.create_preview_configuration(main={"format":>
picam2.start()
i=0
while True:
    # Captura un frame
    im = picam2.capture_array()

    # Verifica si la imagen fue capturada correctamente
    if im is not None:
        i+=1
        print(f"Frame leído correctamente.{i}")
        if i<=40:
            cv2.imwrite(f"Imagen_{i}.jpg",im)
    else:
        print("Error al leer el frame.")

    # Mostrar la imagen (opcional)
    #cv2.imshow("Camera", im)

    # Rompe el bucle si presionas la tecla 'q'
   # if cv2.waitKey(1) & 0xFF == ord('q'):
    #    break

#cv2.destroyAllWindows()

#TX2
import asyncio
import websockets
import cv2
from picamera2 import Picamera2
import time

# Dirección y puerto del servidor
SERVER_URL = "ws://192.168.1.66:8000/ws"

# Inicializa la cámara
picam2 = Picamera2()
picam2.configure(picam2.create_preview_configuration(main={"format": 'XRGB8888', "size": (640, 480)}))
picam2.start()

async def send_video():
    # Inicializar la cámara usando OpenCV

    try:
        async with websockets.connect(SERVER_URL) as websocket:
            while True:
                # Leer un frame de la cámara
                frame = picam2.capture_array()
                #if not frame:
                 #   print("Error al leer el frame")
                  #  break

                # Codificar el frame en formato JPEG
                _, buffer = cv2.imencode(".jpg", frame)
                frame_data = buffer.tobytes()

                # Enviar el frame al servidor
                await websocket.send(frame_data)
                time.sleep(0.2)
 #frame.release()
                #frame_data.release()

                # Recibir confirmación del servidor
#                response = await websocket.recv()
#                print(f"Respuesta del servidor: {response}")

    except Exception as e:
        print(f"Error: {e}")
#    finally:
#        cap.release()

if __name__ == "__main__":
    asyncio.run(send_video())

#TX3import asyncio
import websockets
import cv2
from picamera2 import Picamera2

SERVER_URL = "ws://192.168.1.66:8000/ws"

picam2 = Picamera2()
picam2.configure(picam2.create_preview_configuration(main={"format": 'XRGB8888', "size": (640, 480)}))
picam2.start()

async def send_video(frame_count):
    try:
        async with websockets.connect(SERVER_URL) as websocket:
            while True:
                # Leer un frame de la cámara
                frame = picam2.capture_array()
               # if not frame:
                #    print("Error al leer el frame")
                 #   break

                # Codificar el frame en formato JPEG
                _, buffer = cv2.imencode(".jpg", frame)
                frame_data = buffer.tobytes()

                # Enviar el frame al servidor
                await websocket.send(frame_data)

                # Enviar un "ping" cada 10 frames o cada segundo
                if frame_count % 10 == 0:
                    await websocket.ping()

                # Recibir confirmación del servidor
                response = await websocket.recv()
                print(f"Respuesta del servidor: {response}")

                # Pausar brevemente para no saturar la conexión
                await asyncio.sleep(0.05)  # Ajusta el valor según la velocidad de tu red

                frame_count += 1

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    frame_count = 0  # Para contar los frames y enviar pings cada ciertos frames
    asyncio.run(send_video(frame_count))
