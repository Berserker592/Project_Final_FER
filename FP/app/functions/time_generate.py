from datetime import datetime, timedelta
import pytz
    

def time_start():
    #Definir la zona horaria
    zh_ecuador = pytz.timezone('America/Guayaquil')
    time_now = datetime.now(zh_ecuador)
    return time_now

def time_end():
    #Defino un tiempo de coexion maximo de 10 minutos
    zh_ecuador = pytz.timezone('America/Guayaquil')
    time_end = datetime.now(zh_ecuador) + timedelta(minutes=20)
    return time_end

def time_elapsed(time):
    elapsed = str(time_start()-time)
    return elapsed

def timestamp():
    return time_start().strftime("%d_%m_%Y_%H:%M:%S") 

def timestamp2():
    return time_start().strftime('%Y-%m-%dT%H:%M:%S.%f')