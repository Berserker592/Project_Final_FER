from fastapi import APIRouter
from fastapi.responses import FileResponse

get_start = APIRouter()

# Página principal
#@app.get("/", response_class=HTMLResponse)
#async def home(request: Request):
     # Renderiza el archivo index.html desde la carpeta templates
#    return templates.TemplateResponse("index.html", {"request": request})


@get_start.get("/")
def get_frontend():
#Aumentar / en el directorio para el servidor
    return FileResponse("/app/static/index.html")