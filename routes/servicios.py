from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class Servicio(BaseModel):
    nombre: str
    precio: float


# Simula una base de datos en memoria
servicios_db = [
    {"nombre": "consulta", "precio": 50},
    {"nombre": "baño", "precio": 60},
    {"nombre": "corte", "precio": 100},
]


@router.get("/servicios")
def listar_servicios():
    return {"servicios": servicios_db}


@router.post("/agregar-servicio")
def agregar_servicio(nuevo: Servicio):
    servicios_db.append(nuevo.dict())
    return {"mensaje": "¡Servicio guardado!", "servicio": nuevo.dict()}


# ----- Gestión de mascotas -----


class Mascota(BaseModel):
    correo: str
    nombre: str
    tipo_servicio: str
    fecha: str


# Simula una tabla de mascotas en memoria
mascotas_db = []


@router.post("/registrar-mascota")
def registrar_mascota(m: Mascota):
    mascotas_db.append(m.dict())
    return {"mensaje": "Mascota registrada", "mascota": m.dict()}


@router.get("/mascotas/{correo}")
def listar_mascotas_por_dueño(correo: str):
    resultado = [m for m in mascotas_db if m.get("correo") == correo]
    return {"correo": correo, "mascotas": resultado}


@router.get("/reporte/{correo}")
def reporte_por_usuario(correo: str):
    registros = [m for m in mascotas_db if m.get("correo") == correo]
    cantidad = len(registros)
    servicios = [r.get("tipo_servicio") for r in registros]
    # Calcular total consultando servicios_db por nombre
    total = 0
    for s in servicios:
        precio = next((it.get("precio", 0) for it in servicios_db if it.get("nombre") == s), 0)
        try:
            total += float(precio)
        except Exception:
            pass
    return {
        "correo": correo,
        "cantidad_servicios": cantidad,
        "servicios": servicios,
        "total_gastado": total,
    }
