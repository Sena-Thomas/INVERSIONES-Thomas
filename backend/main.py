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
    type = Column(String, index=True) # "PASIVA" o "ACTIVA"
    asset_name = Column(String, index=True)
    invested_amount = Column(Float)
    current_value = Column(Float)

class ExpenseDB(Base):
    __tablename__ = "expenses" # Gastos Hormiga y Billetera
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String) # "INGRESO" o "GASTO"
    description = Column(String)
    amount = Column(Float)
    date = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# ==========================================
# 🧠 CONFIGURACIÓN DE LA IA
# ==========================================
# CORRECCIÓN: Usar variables de entorno o string con comillas para la API KEY
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY", "TU_API_KEY_AQUI_CON_COMILLAS") 
genai.configure(api_key=GOOGLE_API_KEY)
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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# 💸 GASTOS HORMIGA Y BILLETERA (NUEVO)
# ==========================================
class ExpenseCreate(BaseModel):
    type: str # "INGRESO" o "GASTO"
    description: str = "Movimiento General"
    amount: float

@app.get("/api/wallet")
def get_wallet_movements():
    """Trae todos los ingresos y gastos hormiga"""
    db = SessionLocal()
    records = db.query(ExpenseDB).order_by(ExpenseDB.date.desc()).all()
    # Calcular saldo disponible
    saldo = sum(r.amount if r.type == "INGRESO" else -r.amount for r in records)
    db.close()
    return {"saldo_billetera": saldo, "movimientos": records}

@app.post("/api/wallet")
def add_wallet_movement(expense: ExpenseCreate):
    """Agrega dinero a tu billetera o registra un gasto hormiga"""
    db = SessionLocal()
    new_record = ExpenseDB(
        type=expense.type,
        description=expense.description,
        amount=expense.amount
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    db.close()
    return {"status": "success", "data": new_record}

# ==========================================
# 📈 ENDPOINTS DEL PORTAFOLIO (INVERSIONES)
# ==========================================
class InvestmentCreate(BaseModel):
    type: str # "PASIVA" o "ACTIVA"
    asset_name: str
    invested_amount: float
    current_value: float

@app.get("/api/investments")
def get_investments():
    db = SessionLocal()
    records = db.query(InvestmentDB).all()
    db.close()
    return records

@app.post("/api/investments")
def add_investment(inv: InvestmentCreate):
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
    db = SessionLocal()
    inv = db.query(InvestmentDB).filter(InvestmentDB.id == inv_id).first()
    if not inv:
        db.close()
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
    db.delete(inv)
    db.commit()
    db.close()
    return {"status": "success"}

# ==========================================
# 🌐 ENDPOINTS GENERALES Y MERCADO
# ==========================================
@app.get("/api/capital-neto")
def get_capital_neto():
    """Calcula el Capital Neto Total: (Total Inversiones) + (Saldo Billetera)"""
    db = SessionLocal()
    
    # Sumar billetera
    movimientos = db.query(ExpenseDB).all()
    saldo_billetera = sum(m.amount if m.type == "INGRESO" else -m.amount for m in movimientos)
    
    # Sumar valor actual de inversiones
    inversiones = db.query(InvestmentDB).all()
    total_inversiones = sum(i.current_value for i in inversiones)
    
    db.close()
    return {
        "capital_neto_total": saldo_billetera + total_inversiones,
        "desglose": {
            "billetera": saldo_billetera,
            "inversiones": total_inversiones
        }
    }

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
