import httpx

path = "https://emotionvisia.com/save-analysis-report/"
#path = "https://emotionvisia.com/save-analysis-report/"
async def backup_save_analysis():
    """ Llama a la API para guardar el análisis del paciente. """
    url = path
    data = {"patient_name": "Archivo_R"}


    async with httpx.AsyncClient() as client:
        await client.post(url, data=data)