from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class Credentials(BaseModel):
    correo: str
    contrasena: str


# Simula una tabla de usuarios en memoria
users_db = []


@router.post("/register")
def register(creds: Credentials):
    users_db.append(creds.dict())
    return {"mensaje": "Registro exitoso", "usuario": creds.dict()}


@router.post("/login")
def login(creds: Credentials):
    # Verifica si el usuario fue registrado previamente
    for u in users_db:
        if u.get("correo") == creds.correo and u.get("contrasena") == creds.contrasena:
            return {"mensaje": "Login exitoso", "usuario": creds.dict()}
    raise HTTPException(status_code=400, detail="Credenciales inválidas")
