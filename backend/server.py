"""
AfriWonder Backend - APIs Complémentaires Mobile
Le backend PWA (afriwonder.onrender.com) gère: auth, vidéos, produits, notifications, users
Ce backend gère les fonctionnalités mobile-spécifiques: messaging, wallet, upload
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import jwt
import hashlib
from dotenv import load_dotenv
import os
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

app = FastAPI(
    title="AfriWonder Mobile API",
    description="APIs complémentaires pour l'application mobile AfriWonder",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "afriwonder_mobile")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
conversations_col = db["conversations"]
messages_col = db["messages"]
wallet_col = db["wallets"]
transactions_col = db["transactions"]

# JWT Configuration (matches PWA backend for token verification)
JWT_SECRET = os.getenv("JWT_SECRET", "afriwonder-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

# Helper: verify JWT token (compatible with PWA backend tokens)
def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token manquant")
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("user_id") or payload.get("userId") or payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ==================== HEALTH CHECK ====================
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "AfriWonder Mobile API", "version": "2.0.0"}

# ==================== MESSAGING API (Complémentaire) ====================

class MessageRequest(BaseModel):
    content: str
    type: str = "text"

class ConversationCreateRequest(BaseModel):
    participant_ids: List[str]
    name: Optional[str] = None
    is_group: bool = False

@app.get("/api/mobile/conversations")
async def get_conversations(user_id: str = Depends(verify_token)):
    """Liste des conversations de l'utilisateur"""
    convos = await conversations_col.find(
        {"participant_ids": user_id}
    ).sort("updated_at", -1).to_list(50)

    # If no conversations yet, seed some demo data
    if not convos:
        await seed_demo_conversations(user_id)
        convos = await conversations_col.find(
            {"participant_ids": user_id}
        ).sort("updated_at", -1).to_list(50)

    for c in convos:
        c["_id"] = str(c["_id"])
    return {"success": True, "data": {"conversations": convos}}

@app.post("/api/mobile/conversations")
async def create_conversation(data: ConversationCreateRequest, user_id: str = Depends(verify_token)):
    """Créer une nouvelle conversation"""
    all_participants = list(set([user_id] + data.participant_ids))
    conv = {
        "id": str(uuid.uuid4()),
        "participant_ids": all_participants,
        "name": data.name,
        "is_group": data.is_group or len(all_participants) > 2,
        "last_message": None,
        "last_message_at": None,
        "unread_count": 0,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    await conversations_col.insert_one(conv)
    conv["_id"] = str(conv.get("_id", ""))
    return {"success": True, "data": conv}

@app.get("/api/mobile/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, page: int = 1, limit: int = 30, user_id: str = Depends(verify_token)):
    """Messages d'une conversation"""
    skip = (page - 1) * limit
    msgs = await messages_col.find(
        {"conversation_id": conversation_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    for m in msgs:
        m["_id"] = str(m["_id"])
    msgs.reverse()
    return {"success": True, "data": {"messages": msgs, "page": page}}

@app.post("/api/mobile/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, data: MessageRequest, user_id: str = Depends(verify_token)):
    """Envoyer un message"""
    msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": user_id,
        "content": data.content,
        "type": data.type,
        "is_read": False,
        "created_at": datetime.utcnow().isoformat(),
    }
    await messages_col.insert_one(msg)

    # Update conversation
    await conversations_col.update_one(
        {"id": conversation_id},
        {"$set": {
            "last_message": data.content,
            "last_message_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }}
    )

    msg["_id"] = str(msg.get("_id", ""))
    return {"success": True, "data": msg}

async def seed_demo_conversations(user_id: str):
    """Seed demo conversations for new users"""
    demo_users = [
        {"id": "demo-aminata", "name": "Aminata Diallo", "avatar": "https://i.pravatar.cc/150?img=1"},
        {"id": "demo-moussa", "name": "Moussa Ndiaye", "avatar": "https://i.pravatar.cc/150?img=2"},
        {"id": "demo-awa", "name": "Awa Konaté", "avatar": "https://i.pravatar.cc/150?img=3"},
    ]
    demo_messages = [
        "Salut ! Comment ça va ?",
        "Tu as vu la nouvelle vidéo ?",
        "On se retrouve au marché demain ?",
    ]
    for i, u in enumerate(demo_users):
        conv_id = str(uuid.uuid4())
        conv = {
            "id": conv_id,
            "participant_ids": [user_id, u["id"]],
            "participant_info": {u["id"]: {"name": u["name"], "avatar": u["avatar"]}},
            "name": None,
            "is_group": False,
            "last_message": demo_messages[i],
            "last_message_at": (datetime.utcnow() - timedelta(hours=i + 1)).isoformat(),
            "unread_count": 1 if i == 0 else 0,
            "created_at": (datetime.utcnow() - timedelta(days=i + 1)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(hours=i + 1)).isoformat(),
        }
        await conversations_col.insert_one(conv)

        # Add demo messages
        for j in range(3):
            msg = {
                "id": str(uuid.uuid4()),
                "conversation_id": conv_id,
                "sender_id": u["id"] if j % 2 == 0 else user_id,
                "content": [demo_messages[i], "Oui ça va bien !", "Super, à bientôt !"][j],
                "type": "text",
                "is_read": True,
                "created_at": (datetime.utcnow() - timedelta(hours=i + 1, minutes=30 - j * 10)).isoformat(),
            }
            await messages_col.insert_one(msg)

# ==================== WALLET API (Complémentaire) ====================

class TransferRequest(BaseModel):
    recipient_phone: str
    amount: float
    description: Optional[str] = None
    payment_method: str = "orange-money"

class TopUpRequest(BaseModel):
    amount: float
    phone: str
    provider: str = "orange-money"

@app.get("/api/mobile/wallet")
async def get_wallet(user_id: str = Depends(verify_token)):
    """Obtenir le portefeuille de l'utilisateur"""
    wallet = await wallet_col.find_one({"user_id": user_id})
    if not wallet:
        wallet = {
            "user_id": user_id,
            "balance": 25000,
            "currency": "FCFA",
            "created_at": datetime.utcnow().isoformat(),
        }
        await wallet_col.insert_one(wallet)

    wallet["_id"] = str(wallet.get("_id", ""))

    # Get recent transactions
    txns = await transactions_col.find(
        {"$or": [{"sender_id": user_id}, {"recipient_id": user_id}]}
    ).sort("created_at", -1).limit(20).to_list(20)
    for t in txns:
        t["_id"] = str(t["_id"])

    return {"success": True, "data": {"wallet": wallet, "transactions": txns}}

@app.post("/api/mobile/wallet/topup")
async def topup_wallet(data: TopUpRequest, user_id: str = Depends(verify_token)):
    """Recharger le portefeuille via Mobile Money"""
    wallet = await wallet_col.find_one({"user_id": user_id})
    if not wallet:
        wallet = {"user_id": user_id, "balance": 0, "currency": "FCFA", "created_at": datetime.utcnow().isoformat()}
        await wallet_col.insert_one(wallet)

    new_balance = wallet["balance"] + data.amount
    await wallet_col.update_one({"user_id": user_id}, {"$set": {"balance": new_balance}})

    txn = {
        "id": str(uuid.uuid4()),
        "type": "topup",
        "amount": data.amount,
        "currency": "FCFA",
        "sender_id": user_id,
        "recipient_id": user_id,
        "provider": data.provider,
        "phone": data.phone,
        "status": "completed",
        "description": f"Recharge {data.provider}",
        "created_at": datetime.utcnow().isoformat(),
    }
    await transactions_col.insert_one(txn)
    txn["_id"] = str(txn.get("_id", ""))

    return {"success": True, "data": {"balance": new_balance, "transaction": txn}}

@app.post("/api/mobile/wallet/transfer")
async def transfer_money(data: TransferRequest, user_id: str = Depends(verify_token)):
    """Transférer de l'argent"""
    wallet = await wallet_col.find_one({"user_id": user_id})
    if not wallet or wallet["balance"] < data.amount:
        raise HTTPException(status_code=400, detail="Solde insuffisant")

    new_balance = wallet["balance"] - data.amount
    await wallet_col.update_one({"user_id": user_id}, {"$set": {"balance": new_balance}})

    txn = {
        "id": str(uuid.uuid4()),
        "type": "transfer",
        "amount": data.amount,
        "currency": "FCFA",
        "sender_id": user_id,
        "recipient_id": data.recipient_phone,
        "payment_method": data.payment_method,
        "status": "completed",
        "description": data.description or f"Transfert à {data.recipient_phone}",
        "created_at": datetime.utcnow().isoformat(),
    }
    await transactions_col.insert_one(txn)
    txn["_id"] = str(txn.get("_id", ""))

    return {"success": True, "data": {"balance": new_balance, "transaction": txn}}

@app.get("/api/mobile/wallet/transactions")
async def get_transactions(user_id: str = Depends(verify_token), page: int = 1, limit: int = 20):
    """Historique des transactions"""
    skip = (page - 1) * limit
    txns = await transactions_col.find(
        {"$or": [{"sender_id": user_id}, {"recipient_id": user_id}]}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for t in txns:
        t["_id"] = str(t["_id"])
    return {"success": True, "data": {"transactions": txns, "page": page}}

@app.post("/api/live/start")
async def start_live(title: str, user_id: str = Depends(verify_token)):
    return {
        "streamId": str(uuid.uuid4()),
        "streamKey": str(uuid.uuid4()),
        "rtmpUrl": "rtmp://live.afriwonder.com/live",
        "status": "ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
