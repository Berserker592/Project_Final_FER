from jwt import encode, decode
from os import getenv
from datetime import datetime, timedelta
from dotenv import load_dotenv
from Token_decod import validation_token
import pytz

load_dotenv()
#Definir la zona horaria
zh_ecuador = pytz.timezone('America/Guayaquil')

#Hora Actual
#c_time = datetime.now(pytz.utc).astimezone(zh_ecuador).strftime('%Y-%m-%d %H:%M:%S')

print("--Generador de Tokens--")
num = int(input("Ingresa la cantidad de horas de validez del token: "))

def expire_data(min:int):
    now = datetime.now(zh_ecuador)
    new_date = now + timedelta(hours=min)
    print(f'la fecha sera {new_date}')
    return new_date

def create_token(data:  dict, time):
    token = encode(payload = {**data, "exp": expire_data(time)}, key=getenv("SECRET"), algorithm="HS256")
    print(f'El token creado es {token}')
    #validation_token(token)

data={'username': 'Paul Guamani'}
create_token(data, num)
