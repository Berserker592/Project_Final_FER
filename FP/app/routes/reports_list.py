from fastapi import APIRouter
import os

router = APIRouter()


@router.get("/list-reports/")
async def list_reports():
#Aumentar / en el directorio para el servidor
    reports = os.listdir("/app/Archivos/Reportes/")
    videos = os.listdir("/app/Archivos/Videos/")
    return {"reports": reports, "videos": videos}