from jwt import decode
from jwt import exceptions
from os import getenv
from flask import jsonify
from dotenv import load_dotenv
load_dotenv()

def validation_token(token, ouput=True):
    
    try:
        if ouput:
            pass
            #return decode(token, key=getenv("SECRET"), algorithms=["HS256"])
        decode(token, key=getenv("SECRET"), algorithms=["HS256"])
        return {"valid": True, "message": "Token Valido"}
    except exceptions.DecodeError:
        return {"valid": False, "message": "Token Inválido"}
        #raise ValueError("Token Inválido")
        #response = jsonify({"message":"Token Invalido"})
        #response.status_code = 401
        #print('Token Invalido')
        #return response
    except exceptions.ExpiredSignatureError:
        return {"valid": False, "message": "Token Expirado"}
        #raise ValueError("Token Expirado")
        #response = jsonify({"message":"Token Expirado"})
        #response.status_code = 401
        #print('Token Expirado')
        #return response

