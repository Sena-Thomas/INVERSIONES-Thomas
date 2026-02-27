from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
import google.generativeai as genai
from datetime import datetime
import os

# ==========================================
# 🗄️ CONFIGURACIÓN DE BASE DE DATOS (SQLAlchemy)
# ==========================================
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

# Crea un archivo local llamado 'boveda_financiera.db'
SQLALCHEMY_DATABASE_URL = "sqlite:///./boveda_financiera.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODELOS DE LA BASE DE DATOS ---
class CapitalHistoryDB(Base):
    __tablename__ = "capital_history"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)

class InvestmentDB(Base):
    __tablename__ = "investments"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, index=True) # "PASIVA" (Dafuturo) o "RIESGO" (Acciones)
    asset_name = Column(String, index=True)
    invested_amount = Column(Float)
    current_value = Column(Float)

class ExpenseDB(Base):
    __tablename__ = "expenses" # Gastos Hormiga
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    amount = Column(Float)
    date = Column(DateTime, default=datetime.utcnow)

# Creamos las tablas en el archivo
Base.metadata.create_all(bind=engine)

# ==========================================
# 🧠 CONFIGURACIÓN DE LA IA
# ==========================================
GOOGLE_API_KEY = "TU_API_KEY_AQUI" 
genai.configure(api_key=GAIzaSyDRG1cAEDgYbApzTfxGbwWatOsroyS2wek)
model = genai.GenerativeModel('gemini-2.5-flash') 

# ==========================================
# 🚀 INICIALIZACIÓN DEL BACKEND
# ==========================================
app = FastAPI(title="Giga-Terminal API con Base de Datos")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DEPENDENCIAS ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Modelos Pydantic para recibir datos del Frontend
class CapitalCreate(BaseModel):
    amount: float

# ==========================================
# 🔌 ENDPOINTS DE LA BASE DE DATOS
# ==========================================

@app.post("/api/capital")
def add_capital_history(capital: CapitalCreate):
    """Guarda un nuevo registro de tu capital total en la historia"""
    db = SessionLocal()
    new_record = CapitalHistoryDB(amount=capital.amount)
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    db.close()
    return {"status": "success", "message": "Capital histórico guardado papu"}

@app.get("/api/capital")
def get_capital_history():
    """Trae todo el historial para dibujar la gráfica en la Terminal"""
    db = SessionLocal()
    records = db.query(CapitalHistoryDB).all()
    db.close()
    return [{"id": r.id, "amount": r.amount, "date": r.date} for r in records]

# (Los endpoints de Yahoo Finance y el Chat siguen iguales abajo)
@app.get("/api/asset/{ticker}")
def get_asset_data(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1mo")
        if hist.empty: raise HTTPException(status_code=404, detail="Ticker no encontrado.")
        current_price = round(hist['Close'].iloc[-1], 2)
        sma_20 = round(hist['Close'].tail(20).mean(), 2)
        return {"asset": ticker.upper(), "real_price": current_price, "sma_20": sma_20}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
def chat_with_ai(request: ChatRequest):
    try:
        response = model.generate_content(f"Eres Giga.IA, experto financiero. Responde breve y con actitud Giga-chad a: {request.message}")
        return {"response": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        # --- MODELOS PYDANTIC PARA INVERSIONES ---
class InvestmentCreate(BaseModel):
    type: str # "PASIVA" o "RIESGO"
    asset_name: str
    invested_amount: float
    current_value: float

# ==========================================
# 📈 ENDPOINTS DEL PORTAFOLIO (INVERSIONES)
# ==========================================

@app.get("/api/investments")
def get_investments():
    """Trae todas tus inversiones guardadas en la base de datos"""
    db = SessionLocal()
    records = db.query(InvestmentDB).all()
    db.close()
    return records

@app.post("/api/investments")
def add_investment(inv: InvestmentCreate):
    """Guarda una nueva inversión en tu portafolio"""
    db = SessionLocal()
    new_inv = InvestmentDB(
        type=inv.type,
        asset_name=inv.asset_name.upper(),
        invested_amount=inv.invested_amount,
        current_value=inv.current_value
    )
    db.add(new_inv)
    db.commit()
    db.refresh(new_inv)
    db.close()
    return {"status": "success", "data": new_inv}

@app.delete("/api/investments/{inv_id}")
def delete_investment(inv_id: int):
    """Vende/Elimina una inversión de tu portafolio"""
    db = SessionLocal()
    inv = db.query(InvestmentDB).filter(InvestmentDB.id == inv_id).first()
    if not inv:
        db.close()
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
    db.delete(inv)
    db.commit()
    db.close()
    return {"status": "success", "message": "Inversión eliminada"}