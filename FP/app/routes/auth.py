from fastapi import APIRouter, HTTPException, Form
from fastapi.responses import JSONResponse
from Encryption.Token_decod import validation_token

validatetoken = APIRouter()

@validatetoken.post("/validate-token/")
async def verify_token(token: str = Form(...)):
    """Recibe el token desde el frontend y lo valida."""
    if not token:
        raise HTTPException(status_code=400, detail="El token es requerido")

    try:
        validation_result = validation_token(token=token, ouput=True)
        return JSONResponse(content={"message": validation_result["message"],"valid":validation_result["valid"]})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al validar el token: {str(e)}")

#async def verify_token(
#    token: str = Form(...)
#    ):    
#    return JSONResponse(content={"message": validation_token(token)["message"]})
#    #return {"message": validation_token(token)["message"]}
    
#@routes_auth.route("/verify/token")
#def verify():
#    token = request.headers['Authorization'].split(" ")[1]
#    return validation_token(token=token, ouput=True)