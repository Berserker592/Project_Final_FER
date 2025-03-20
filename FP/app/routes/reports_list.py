from fastapi import APIRouter
import os
from app.functions.path import path_ret

router = APIRouter()

path = path_ret()

@router.get("/list-reports/")
async def list_reports():
#Aumentar / en el directorio para el servidor
    reports = os.listdir(f"{path}Archivos/Reportes/")
    videos = os.listdir(f"{path}Archivos/Videos/")
    return {"reports": reports, "videos": videos}