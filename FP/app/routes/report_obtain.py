import pandas as pd
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import JSONResponse


# Ruta donde se almacenan los reportes CSV
REPORTS_DIR = Path("/app/Archivos/Reportes")


#@app.get("/get-report/{report_name}")
#async def get_report(report_name: str):
#    report_path = REPORTS_DIR / report_name
#    if not report_path.exists():
#        return JSONResponse(status_code=404, content={"message": "Reporte no encontrado"})
#
#    # Leer el archivo CSV y convertirlo a JSON
#    df = pd.read_csv(report_path)
#    return df.to_dict(orient="records")

router = APIRouter()

@router.get("/get-report/{report_name}")
async def get_report(report_name: str):
    report_path = REPORTS_DIR / report_name
    if not report_path.exists():
        return JSONResponse(status_code=404, content={"message": "Reporte no encontrado"})

    # Leer el archivo CSV y convertirlo a JSON
    df = pd.read_csv(report_path)
    return df.to_dict(orient="records")
