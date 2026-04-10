"""
AfriWonder Backend - APIs Complémentaires Mobile
Le backend PWA (afriwonder.onrender.com) gère: auth, vidéos, produits, notifications, users
Ce backend gère les fonctionnalités mobile-spécifiques: messaging, wallet, upload
+ Proxy auth pour contourner la détection anti-bot depuis les appareils mobiles
"""

from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import jwt
import hashlib
from dotenv import load_dotenv
import os
import aiofiles
import httpx
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

# Static files for uploads
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

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
# New collections for monetization features
tips_col = db["mobile_tips"]
earnings_col = db["creator_earnings"]
withdrawals_col = db["mobile_withdrawals"]
ads_col = db["mobile_ads"]
lives_col = db["mobile_lives"]
highlights_col = db["mobile_highlights"]
posts_col = db["mobile_posts"]
# Chat collections
reactions_col = db["message_reactions"]
pinned_col = db["pinned_messages"]
starred_col = db["starred_messages"]

# JWT Configuration (matches PWA backend for token verification)
JWT_SECRET = os.getenv("JWT_SECRET", "afriwonder-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

# Helper: verify JWT token (compatible with both PWA and local tokens)
def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token manquant")
    try:
        token = authorization.replace("Bearer ", "")
        # First try local secret
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.InvalidTokenError:
            # If local secret fails, decode without verification (trust PWA backend token)
            payload = jwt.decode(token, options={"verify_signature": False}, algorithms=[JWT_ALGORITHM])
        return payload.get("user_id") or payload.get("userId") or payload.get("sub") or payload.get("id")
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide")

# ==================== HEALTH CHECK ====================
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "AfriWonder Mobile API", "version": "2.0.0"}

# ==================== AUTH PROXY (Anti-bot bypass) ====================
# Le backend PWA détecte les requêtes depuis les appareils mobiles comme "bot"
# Ce proxy ajoute les headers nécessaires côté serveur pour contourner la détection

PWA_API_BASE = "https://afriwonder.onrender.com/api"
PWA_ANTI_BOT_HEADERS = {
    "User-Agent": "AfriWonder-Mobile/1.0 (React Native; Expo)",
    "Origin": "https://afriwonder.onrender.com",
    "Referer": "https://afriwonder.onrender.com/",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

class ProxyLoginRequest(BaseModel):
    identifier: str
    password: str

class ProxyRegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    referral_code: Optional[str] = None

@app.post("/api/proxy/auth/login")
async def proxy_auth_login(data: ProxyLoginRequest):
    """Proxy login vers le backend PWA avec anti-bot headers"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as hc:
            response = await hc.post(
                f"{PWA_API_BASE}/auth/login",
                json={"identifier": data.identifier, "password": data.password},
                headers=PWA_ANTI_BOT_HEADERS,
            )
            result = response.json()
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=result.get("error", result.get("message", "Erreur de connexion")))
            return result
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Service PWA indisponible: {str(e)}")

@app.post("/api/proxy/auth/register")
async def proxy_auth_register(data: ProxyRegisterRequest):
    """Proxy register vers le backend PWA avec anti-bot headers"""
    try:
        payload = {"username": data.username, "password": data.password}
        if data.email: payload["email"] = data.email
        if data.phone: payload["phone"] = data.phone
        if data.full_name: payload["full_name"] = data.full_name
        if data.referral_code: payload["referral_code"] = data.referral_code
        async with httpx.AsyncClient(timeout=30.0) as hc:
            response = await hc.post(
                f"{PWA_API_BASE}/auth/register",
                json=payload,
                headers=PWA_ANTI_BOT_HEADERS,
            )
            result = response.json()
            if response.status_code != 200 and response.status_code != 201:
                raise HTTPException(status_code=response.status_code, detail=result.get("error", result.get("message", "Erreur d'inscription")))
            return result
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Service PWA indisponible: {str(e)}")

@app.post("/api/proxy/auth/refresh")
async def proxy_auth_refresh(request: Request):
    """Proxy refresh token vers le backend PWA"""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as hc:
            response = await hc.post(
                f"{PWA_API_BASE}/auth/refresh",
                json=body,
                headers=PWA_ANTI_BOT_HEADERS,
            )
            result = response.json()
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=result.get("error", "Erreur de refresh"))
            return result
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Service PWA indisponible: {str(e)}")

@app.get("/api/proxy/auth/me")
async def proxy_auth_me(authorization: Optional[str] = Header(None)):
    """Proxy /auth/me vers le backend PWA"""
    try:
        headers = {**PWA_ANTI_BOT_HEADERS}
        if authorization:
            headers["Authorization"] = authorization
        async with httpx.AsyncClient(timeout=30.0) as hc:
            response = await hc.get(f"{PWA_API_BASE}/auth/me", headers=headers)
            result = response.json()
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=result.get("error", "Erreur"))
            return result
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Service PWA indisponible: {str(e)}")

@app.api_route("/api/proxy/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_generic(path: str, request: Request):
    """Proxy générique vers le backend PWA pour toutes les autres routes API"""
    try:
        headers = {**PWA_ANTI_BOT_HEADERS}
        auth_header = request.headers.get("authorization")
        if auth_header:
            headers["Authorization"] = auth_header
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
        async with httpx.AsyncClient(timeout=30.0) as hc:
            response = await hc.request(
                method=request.method,
                url=f"{PWA_API_BASE}/{path}",
                headers=headers,
                content=body,
                params=dict(request.query_params),
            )
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Service PWA indisponible: {str(e)}")


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

# ==================== CHAT ENHANCED APIs ====================

class ReactionRequest(BaseModel):
    emoji: str

class DeleteMessageRequest(BaseModel):
    delete_for: str = "me"  # "me" or "everyone"

class ForwardRequest(BaseModel):
    target_conversation_id: str

class EditMessageRequest(BaseModel):
    content: str

@app.post("/api/mobile/conversations/{conversation_id}/messages/{message_id}/react")
async def react_to_message(conversation_id: str, message_id: str, data: ReactionRequest, user_id: str = Depends(verify_token)):
    """Ajouter/retirer une réaction emoji à un message"""
    existing = await reactions_col.find_one({"message_id": message_id, "user_id": user_id, "emoji": data.emoji})
    if existing:
        await reactions_col.delete_one({"_id": existing["_id"]})
        return {"success": True, "data": {"action": "removed", "emoji": data.emoji}}
    reaction = {
        "id": str(uuid.uuid4()),
        "message_id": message_id,
        "conversation_id": conversation_id,
        "user_id": user_id,
        "emoji": data.emoji,
        "created_at": datetime.utcnow().isoformat(),
    }
    await reactions_col.insert_one(reaction)
    return {"success": True, "data": {"action": "added", "emoji": data.emoji}}

@app.get("/api/mobile/conversations/{conversation_id}/messages/{message_id}/reactions")
async def get_reactions(conversation_id: str, message_id: str, user_id: str = Depends(verify_token)):
    """Obtenir les réactions d'un message"""
    reactions = await reactions_col.find({"message_id": message_id}).to_list(100)
    for r in reactions:
        r["_id"] = str(r["_id"])
    return {"success": True, "data": {"reactions": reactions}}

@app.delete("/api/mobile/conversations/{conversation_id}/messages/{message_id}")
async def delete_message(conversation_id: str, message_id: str, delete_for: str = "me", user_id: str = Depends(verify_token)):
    """Supprimer un message"""
    msg = await messages_col.find_one({"id": message_id, "conversation_id": conversation_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    if delete_for == "everyone" and msg.get("sender_id") == user_id:
        await messages_col.update_one({"id": message_id}, {"$set": {"content": "Ce message a été supprimé", "deleted": True, "deleted_at": datetime.utcnow().isoformat()}})
    else:
        await messages_col.update_one({"id": message_id}, {"$addToSet": {"deleted_for": user_id}})
    return {"success": True, "data": {"deleted": True, "delete_for": delete_for}}

@app.post("/api/mobile/conversations/{conversation_id}/messages/{message_id}/pin")
async def pin_message(conversation_id: str, message_id: str, user_id: str = Depends(verify_token)):
    """Épingler/désépingler un message"""
    existing = await pinned_col.find_one({"message_id": message_id, "conversation_id": conversation_id})
    if existing:
        await pinned_col.delete_one({"_id": existing["_id"]})
        return {"success": True, "data": {"pinned": False}}
    pin = {
        "id": str(uuid.uuid4()),
        "message_id": message_id,
        "conversation_id": conversation_id,
        "pinned_by": user_id,
        "pinned_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
    }
    await pinned_col.insert_one(pin)
    return {"success": True, "data": {"pinned": True}}

@app.post("/api/mobile/conversations/{conversation_id}/messages/{message_id}/star")
async def star_message(conversation_id: str, message_id: str, user_id: str = Depends(verify_token)):
    """Marquer/démarquer un message comme important"""
    existing = await starred_col.find_one({"message_id": message_id, "user_id": user_id})
    if existing:
        await starred_col.delete_one({"_id": existing["_id"]})
        return {"success": True, "data": {"starred": False}}
    star = {
        "id": str(uuid.uuid4()),
        "message_id": message_id,
        "conversation_id": conversation_id,
        "user_id": user_id,
        "starred_at": datetime.utcnow().isoformat(),
    }
    await starred_col.insert_one(star)
    return {"success": True, "data": {"starred": True}}

@app.post("/api/mobile/conversations/{conversation_id}/messages/{message_id}/forward")
async def forward_message(conversation_id: str, message_id: str, data: ForwardRequest, user_id: str = Depends(verify_token)):
    """Transférer un message à une autre conversation"""
    original = await messages_col.find_one({"id": message_id})
    if not original:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    fwd_msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": data.target_conversation_id,
        "sender_id": user_id,
        "content": original.get("content", ""),
        "type": original.get("type", "text"),
        "is_read": False,
        "forwarded_from": message_id,
        "created_at": datetime.utcnow().isoformat(),
    }
    await messages_col.insert_one(fwd_msg)
    await conversations_col.update_one(
        {"id": data.target_conversation_id},
        {"$set": {"last_message": original.get("content", ""), "last_message_at": datetime.utcnow().isoformat(), "updated_at": datetime.utcnow().isoformat()}}
    )
    fwd_msg["_id"] = str(fwd_msg.get("_id", ""))
    return {"success": True, "data": fwd_msg}

@app.put("/api/mobile/conversations/{conversation_id}/messages/{message_id}")
async def edit_message(conversation_id: str, message_id: str, data: EditMessageRequest, user_id: str = Depends(verify_token)):
    """Modifier un message (max 15 min après envoi)"""
    msg = await messages_col.find_one({"id": message_id, "sender_id": user_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message non trouvé ou non autorisé")
    created = datetime.fromisoformat(msg["created_at"])
    if (datetime.utcnow() - created).total_seconds() > 900:
        raise HTTPException(status_code=400, detail="Modification impossible après 15 minutes")
    await messages_col.update_one({"id": message_id}, {"$set": {"content": data.content, "edited": True, "edited_at": datetime.utcnow().isoformat()}})
    return {"success": True, "data": {"edited": True, "content": data.content}}

@app.get("/api/mobile/conversations/{conversation_id}/pinned")
async def get_pinned_messages(conversation_id: str, user_id: str = Depends(verify_token)):
    """Obtenir les messages épinglés d'une conversation"""
    pins = await pinned_col.find({"conversation_id": conversation_id}).to_list(20)
    msg_ids = [p["message_id"] for p in pins]
    msgs = await messages_col.find({"id": {"$in": msg_ids}}).to_list(20)
    for m in msgs:
        m["_id"] = str(m["_id"])
    return {"success": True, "data": {"messages": msgs}}

@app.get("/api/mobile/starred-messages")
async def get_starred_messages(user_id: str = Depends(verify_token)):
    """Obtenir tous les messages importants de l'utilisateur"""
    stars = await starred_col.find({"user_id": user_id}).to_list(100)
    msg_ids = [s["message_id"] for s in stars]
    msgs = await messages_col.find({"id": {"$in": msg_ids}}).to_list(100)
    for m in msgs:
        m["_id"] = str(m["_id"])
    return {"success": True, "data": {"messages": msgs}}

@app.post("/api/mobile/conversations/start")
async def start_conversation_with_user(data: dict, user_id: str = Depends(verify_token)):
    """Démarrer une conversation avec un utilisateur réel"""
    target_id = data.get("target_user_id", "")
    target_name = data.get("target_name", "")
    target_avatar = data.get("target_avatar", "")
    if not target_id:
        raise HTTPException(status_code=400, detail="target_user_id requis")
    existing = await conversations_col.find_one({
        "participant_ids": {"$all": [user_id, target_id]},
        "is_group": False
    })
    if existing:
        existing["_id"] = str(existing["_id"])
        return {"success": True, "data": existing}
    conv = {
        "id": str(uuid.uuid4()),
        "participant_ids": [user_id, target_id],
        "participant_info": {
            target_id: {"name": target_name, "avatar": target_avatar},
        },
        "name": None,
        "is_group": False,
        "last_message": None,
        "last_message_at": datetime.utcnow().isoformat(),
        "unread_count": 0,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    await conversations_col.insert_one(conv)
    conv["_id"] = str(conv.get("_id", ""))
    return {"success": True, "data": conv}

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

# ==================== FILE UPLOAD API (Complémentaire) ====================

@app.post("/api/mobile/upload")
async def upload_file(
    file: UploadFile = File(...),
    type: str = Form(default="video"),
    user_id: str = Depends(verify_token)
):
    """Upload a video or image file, returns the URL"""
    # Validate file type
    allowed_video = [".mp4", ".mov", ".avi", ".webm", ".m4v"]
    allowed_image = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
    allowed = allowed_video + allowed_image

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Type de fichier non autorisé: {ext}")

    # Generate unique filename
    file_id = str(uuid.uuid4())[:12]
    filename = f"{file_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Save file
    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Return URL (served via static files)
    file_url = f"/api/uploads/{filename}"

    return {
        "success": True,
        "data": {
            "url": file_url,
            "filename": filename,
            "size": len(content),
            "type": type,
        }
    }

@app.post("/api/live/start")
async def start_live(title: str, user_id: str = Depends(verify_token)):
    return {
        "streamId": str(uuid.uuid4()),
        "streamKey": str(uuid.uuid4()),
        "rtmpUrl": "rtmp://live.afriwonder.com/live",
        "status": "ready"
    }

# ==================== PROFILE UPDATE API (Complémentaire) ====================

profiles_col = db["profiles"]

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None

@app.put("/api/mobile/profile")
async def update_profile(data: ProfileUpdateRequest, user_id: str = Depends(verify_token)):
    """Mettre à jour le profil utilisateur"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()

    await profiles_col.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    profile = await profiles_col.find_one({"user_id": user_id})
    if profile:
        profile["_id"] = str(profile["_id"])
    return {"success": True, "data": profile}

@app.get("/api/mobile/profile")
async def get_profile(user_id: str = Depends(verify_token)):
    """Récupérer le profil étendu"""
    profile = await profiles_col.find_one({"user_id": user_id})
    if profile:
        profile["_id"] = str(profile["_id"])
    return {"success": True, "data": profile or {"user_id": user_id}}

# ==================== STORIES API (Complémentaire) ====================

stories_col = db["stories"]

class StoryCreateRequest(BaseModel):
    media_url: str
    type: str = "image"
    caption: Optional[str] = None
    duration: int = 5

@app.get("/api/mobile/stories")
async def get_stories(user_id: str = Depends(verify_token)):
    """Récupérer les stories actives (< 24h)"""
    cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
    stories = await stories_col.find(
        {"created_at": {"$gte": cutoff}}
    ).sort("created_at", -1).to_list(50)

    if not stories:
        await seed_demo_stories(user_id)
        stories = await stories_col.find(
            {"created_at": {"$gte": cutoff}}
        ).sort("created_at", -1).to_list(50)

    # Group by user
    users_stories = {}
    for s in stories:
        s["_id"] = str(s["_id"])
        uid = s.get("user_id", "unknown")
        if uid not in users_stories:
            users_stories[uid] = {
                "user_id": uid,
                "user_name": s.get("user_name", "Utilisateur"),
                "user_avatar": s.get("user_avatar", f"https://i.pravatar.cc/150?u={uid}"),
                "stories": [],
                "has_unseen": True,
            }
        users_stories[uid]["stories"].append(s)

    return {"success": True, "data": list(users_stories.values())}

@app.post("/api/mobile/stories")
async def create_story(data: StoryCreateRequest, user_id: str = Depends(verify_token)):
    """Créer une story"""
    story = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": "Moi",
        "user_avatar": f"https://i.pravatar.cc/150?u={user_id}",
        "media_url": data.media_url,
        "type": data.type,
        "caption": data.caption,
        "duration": data.duration,
        "views": 0,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
    }
    await stories_col.insert_one(story)
    story["_id"] = str(story.get("_id", ""))
    return {"success": True, "data": story}

async def seed_demo_stories(user_id: str):
    """Seed demo stories"""
    demo_stories = [
        {"user_id": "story-aminata", "user_name": "Aminata", "user_avatar": "https://i.pravatar.cc/150?img=1",
         "media_url": "https://picsum.photos/400/700?random=201", "type": "image", "caption": "Belle journée à Bamako ☀️"},
        {"user_id": "story-moussa", "user_name": "Moussa", "user_avatar": "https://i.pravatar.cc/150?img=2",
         "media_url": "https://picsum.photos/400/700?random=202", "type": "image", "caption": "Au marché 🛍️"},
        {"user_id": "story-awa", "user_name": "Awa", "user_avatar": "https://i.pravatar.cc/150?img=3",
         "media_url": "https://picsum.photos/400/700?random=203", "type": "image", "caption": "Danse traditionnelle 💃"},
        {"user_id": "story-ibrahim", "user_name": "Ibrahim", "user_avatar": "https://i.pravatar.cc/150?img=4",
         "media_url": "https://picsum.photos/400/700?random=204", "type": "image", "caption": "Concert live 🎵"},
        {"user_id": "story-fanta", "user_name": "Fanta", "user_avatar": "https://i.pravatar.cc/150?img=5",
         "media_url": "https://picsum.photos/400/700?random=205", "type": "image", "caption": "Nouvelle coiffure ✨"},
    ]
    for s in demo_stories:
        story = {
            **s, "id": str(uuid.uuid4()), "duration": 5, "views": 0,
            "created_at": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(hours=23)).isoformat(),
        }
        await stories_col.insert_one(story)

# ==================== CROWDFUNDING API (Complémentaire) ====================

crowdfunding_col = db["crowdfunding"]
contributions_col = db["contributions"]

class CrowdfundingCreateRequest(BaseModel):
    title: str
    description: str
    goal_amount: float
    currency: str = "XOF"
    category: str = "general"
    end_date: Optional[str] = None
    image_url: Optional[str] = None

class ContributionRequest(BaseModel):
    amount: float
    payment_method: str = "orange-money"
    anonymous: bool = False

@app.get("/api/mobile/crowdfunding")
async def get_crowdfunding_projects(user_id: str = Depends(verify_token), page: int = 1, limit: int = 20):
    """Lister les projets de crowdfunding"""
    skip = (page - 1) * limit
    projects = await crowdfunding_col.find(
        {"status": {"$in": ["active", "funded"]}}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    if not projects:
        await seed_demo_crowdfunding(user_id)
        projects = await crowdfunding_col.find(
            {"status": {"$in": ["active", "funded"]}}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    total = await crowdfunding_col.count_documents({"status": {"$in": ["active", "funded"]}})
    for p in projects:
        p["_id"] = str(p["_id"])

    return {"success": True, "data": {"projects": projects, "pagination": {"page": page, "total": total}}}

@app.post("/api/mobile/crowdfunding")
async def create_crowdfunding(data: CrowdfundingCreateRequest, user_id: str = Depends(verify_token)):
    """Créer un projet de crowdfunding"""
    project = {
        "id": str(uuid.uuid4()),
        "creator_id": user_id,
        "title": data.title,
        "description": data.description,
        "goal_amount": data.goal_amount,
        "current_amount": 0,
        "currency": data.currency,
        "category": data.category,
        "image_url": data.image_url or "https://picsum.photos/600/400?random=300",
        "contributors_count": 0,
        "status": "active",
        "end_date": data.end_date or (datetime.utcnow() + timedelta(days=30)).isoformat(),
        "created_at": datetime.utcnow().isoformat(),
    }
    await crowdfunding_col.insert_one(project)
    project["_id"] = str(project.get("_id", ""))
    return {"success": True, "data": project}

@app.get("/api/mobile/crowdfunding/{project_id}")
async def get_crowdfunding_project(project_id: str):
    """Détail d'un projet"""
    project = await crowdfunding_col.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    project["_id"] = str(project["_id"])
    contribs = await contributions_col.find({"project_id": project_id}).sort("created_at", -1).to_list(20)
    for c in contribs:
        c["_id"] = str(c["_id"])
    return {"success": True, "data": {"project": project, "contributions": contribs}}

@app.post("/api/mobile/crowdfunding/{project_id}/contribute")
async def contribute_to_project(project_id: str, data: ContributionRequest, user_id: str = Depends(verify_token)):
    """Contribuer à un projet"""
    project = await crowdfunding_col.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    contribution = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "user_id": user_id,
        "amount": data.amount,
        "payment_method": data.payment_method,
        "anonymous": data.anonymous,
        "status": "completed",
        "created_at": datetime.utcnow().isoformat(),
    }
    await contributions_col.insert_one(contribution)

    new_amount = project["current_amount"] + data.amount
    new_count = project["contributors_count"] + 1
    new_status = "funded" if new_amount >= project["goal_amount"] else "active"

    await crowdfunding_col.update_one(
        {"id": project_id},
        {"$set": {"current_amount": new_amount, "contributors_count": new_count, "status": new_status}}
    )
    contribution["_id"] = str(contribution.get("_id", ""))
    return {"success": True, "data": {"contribution": contribution, "project_current_amount": new_amount}}

@app.get("/api/mobile/crowdfunding/my/projects")
async def get_my_crowdfunding(user_id: str = Depends(verify_token)):
    """Mes projets de crowdfunding"""
    projects = await crowdfunding_col.find({"creator_id": user_id}).sort("created_at", -1).to_list(20)
    for p in projects:
        p["_id"] = str(p["_id"])
    return {"success": True, "data": {"projects": projects}}

async def seed_demo_crowdfunding(user_id: str):
    """Seed demo crowdfunding projects"""
    projects = [
        {"title": "École pour les enfants de Sikasso", "description": "Construction d'une école primaire pour 200 enfants dans le village de Sikasso.",
         "goal_amount": 5000000, "current_amount": 3200000, "category": "education",
         "image_url": "https://picsum.photos/seed/school/600/400", "contributors_count": 45},
        {"title": "Atelier de couture pour femmes", "description": "Équipement d'un atelier de couture pour former 50 femmes à la confection.",
         "goal_amount": 2000000, "current_amount": 800000, "category": "social",
         "image_url": "https://picsum.photos/seed/sewing/600/400", "contributors_count": 23},
        {"title": "Puits d'eau à Mopti", "description": "Forage d'un puits d'eau potable pour le quartier de Sévaré à Mopti.",
         "goal_amount": 3500000, "current_amount": 3500000, "category": "sante",
         "image_url": "https://picsum.photos/seed/water/600/400", "contributors_count": 78},
        {"title": "Festival culturel Dogon", "description": "Organisation du festival culturel annuel du pays Dogon.",
         "goal_amount": 1500000, "current_amount": 600000, "category": "culture",
         "image_url": "https://picsum.photos/seed/festival/600/400", "contributors_count": 34},
    ]
    for p in projects:
        project = {
            **p, "id": str(uuid.uuid4()), "creator_id": f"demo-{p['category']}",
            "currency": "XOF", "status": "funded" if p["current_amount"] >= p["goal_amount"] else "active",
            "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "created_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
        }
        await crowdfunding_col.insert_one(project)


# ==================== POSTS MULTI-TYPES (Photo, Texte, Article, Republication Live) ====================

posts_col = db["mobile_posts"]

class CreatePostRequest(BaseModel):
    content_type: str = "text"  # text, photo, article, video, live_replay, highlight
    text: Optional[str] = None
    title: Optional[str] = None  # Pour les articles
    media_urls: Optional[List[str]] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    live_id: Optional[str] = None
    highlight_id: Optional[str] = None
    hashtags: Optional[List[str]] = None
    location: Optional[str] = None

@app.post("/api/mobile/posts")
async def create_post(data: CreatePostRequest, user_id: str = Depends(verify_token)):
    """Créer un post (texte, photo, article, vidéo, republication live/highlight)"""
    post_id = str(uuid.uuid4())
    
    post = {
        "id": post_id,
        "creator_id": user_id,
        "content_type": data.content_type,
        "text": data.text or "",
        "title": data.title,
        "media_urls": data.media_urls or [],
        "video_url": data.video_url,
        "thumbnail_url": data.thumbnail_url,
        "live_id": data.live_id,
        "highlight_id": data.highlight_id,
        "hashtags": data.hashtags or [],
        "location": data.location,
        "likes": 0,
        "comments": 0,
        "shares": 0,
        "views": 0,
        "status": "published",
        "created_at": datetime.utcnow().isoformat(),
    }
    
    # Si c'est une republication de live replay, récupérer les infos du live
    if data.content_type == "live_replay" and data.live_id:
        live = await db.mobile_lives.find_one({"id": data.live_id})
        if live:
            post["video_url"] = live.get("recording_url")
            post["thumbnail_url"] = live.get("thumbnail_url")
            post["title"] = post.get("title") or live.get("title")
            post["text"] = post.get("text") or f"Replay: {live.get('title', '')}"
    
    # Si c'est un highlight/moment fort, récupérer les infos
    if data.content_type == "highlight" and data.highlight_id:
        highlight = await db.mobile_highlights.find_one({"id": data.highlight_id})
        if highlight:
            post["video_url"] = highlight.get("clip_url")
            post["title"] = post.get("title") or highlight.get("title")
            post["text"] = post.get("text") or f"Moment fort: {highlight.get('title', '')}"
    
    await posts_col.insert_one(post)
    post.pop("_id", None)
    
    return {"success": True, "data": post}

@app.get("/api/mobile/posts")
async def get_posts(user_id: str = Depends(verify_token), page: int = 1, limit: int = 20, content_type: Optional[str] = None):
    """Récupérer les posts (tous types ou filtré)"""
    query = {}
    if content_type:
        query["content_type"] = content_type
    
    skip = (page - 1) * limit
    posts_list = await posts_col.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for p in posts_list:
        p.pop("_id", None)
    
    total = await posts_col.count_documents(query)
    return {"success": True, "data": {"posts": posts_list, "pagination": {"page": page, "total": total}}}

@app.get("/api/mobile/posts/my")
async def get_my_posts(user_id: str = Depends(verify_token), page: int = 1, limit: int = 20):
    """Mes posts"""
    skip = (page - 1) * limit
    posts_list = await posts_col.find({"creator_id": user_id}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for p in posts_list:
        p.pop("_id", None)
    return {"success": True, "data": {"posts": posts_list}}

@app.post("/api/mobile/posts/{post_id}/like")
async def like_post(post_id: str, user_id: str = Depends(verify_token)):
    """Liker un post"""
    await posts_col.update_one({"id": post_id}, {"$inc": {"likes": 1}})
    return {"success": True}

@app.post("/api/mobile/live/{live_id}/republish")
async def republish_live(live_id: str, user_id: str = Depends(verify_token)):
    """Republier un live complet comme post dans le feed"""
    live = await db.mobile_lives.find_one({"id": live_id, "creator_id": user_id})
    if not live:
        raise HTTPException(status_code=404, detail="Live non trouvé")
    if live.get("status") != "ended":
        raise HTTPException(status_code=400, detail="Le live doit être terminé")
    
    post_id = str(uuid.uuid4())
    post = {
        "id": post_id,
        "creator_id": user_id,
        "content_type": "live_replay",
        "title": live.get("title", ""),
        "text": f"Replay de mon live: {live.get('title', '')}",
        "video_url": live.get("recording_url"),
        "thumbnail_url": live.get("thumbnail_url"),
        "live_id": live_id,
        "media_urls": [],
        "hashtags": ["live", "replay", live.get("category", "")],
        "likes": 0, "comments": 0, "shares": 0, "views": 0,
        "status": "published",
        "created_at": datetime.utcnow().isoformat(),
    }
    await posts_col.insert_one(post)
    post.pop("_id", None)
    
    return {"success": True, "data": post}



# ==================== PHASE 1: MONETISATION CREATEURS ====================

class TipRequest(BaseModel):
    creator_id: str
    amount: float
    payment_method: str = "orange-money"  # orange-money, wave, moov-money
    message: Optional[str] = None
    video_id: Optional[str] = None

class WithdrawRequest(BaseModel):
    amount: float
    payment_method: str = "orange-money"
    phone: str
    full_name: Optional[str] = None

@app.post("/api/mobile/tips")
async def send_tip(data: TipRequest, user_id: str = Depends(verify_token)):
    """Envoyer un pourboire à un créateur"""
    if data.amount < 100:
        raise HTTPException(status_code=400, detail="Montant minimum: 100 FCFA")
    if data.amount > 500000:
        raise HTTPException(status_code=400, detail="Montant maximum: 500,000 FCFA")

    # Debit viewer wallet
    viewer_wallet = await wallet_col.find_one({"user_id": user_id})
    if not viewer_wallet or viewer_wallet.get("balance", 0) < data.amount:
        raise HTTPException(status_code=400, detail="Solde insuffisant")

    tip_id = str(uuid.uuid4())
    platform_fee = data.amount * 0.05  # 5% commission plateforme
    creator_amount = data.amount - platform_fee

    tip = {
        "id": tip_id,
        "sender_id": user_id,
        "creator_id": data.creator_id,
        "amount": data.amount,
        "creator_amount": creator_amount,
        "platform_fee": platform_fee,
        "payment_method": data.payment_method,
        "message": data.message,
        "video_id": data.video_id,
        "status": "completed",
        "created_at": datetime.utcnow().isoformat(),
    }
    await tips_col.insert_one(tip)

    # Debit viewer
    await wallet_col.update_one(
        {"user_id": user_id},
        {"$inc": {"balance": -data.amount}}
    )

    # Credit creator earnings
    await earnings_col.update_one(
        {"user_id": data.creator_id},
        {
            "$inc": {"total_earned": creator_amount, "available_balance": creator_amount, "total_tips": 1},
            "$set": {"updated_at": datetime.utcnow().isoformat()},
            "$setOnInsert": {"user_id": data.creator_id, "total_withdrawn": 0, "created_at": datetime.utcnow().isoformat()}
        },
        upsert=True
    )

    # Record transaction for viewer
    await transactions_col.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": "tip_sent",
        "amount": -data.amount, "description": f"Pourboire envoyé",
        "recipient_id": data.creator_id, "status": "completed",
        "created_at": datetime.utcnow().isoformat()
    })

    return {"success": True, "data": {"tip_id": tip_id, "amount": data.amount, "creator_amount": creator_amount, "fee": platform_fee}}

@app.get("/api/mobile/creator/earnings")
async def get_creator_earnings(user_id: str = Depends(verify_token)):
    """Dashboard revenus du créateur"""
    db = client[DB_NAME]
    earnings = await db.creator_earnings.find_one({"user_id": user_id})
    if not earnings:
        earnings = {"user_id": user_id, "total_earned": 0, "available_balance": 0, "total_withdrawn": 0, "total_tips": 0}

    # Recent tips received
    recent_tips = await db.mobile_tips.find(
        {"creator_id": user_id}
    ).sort("created_at", -1).limit(20).to_list(20)
    for t in recent_tips:
        t.pop("_id", None)

    # Monthly stats
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_tips = await db.mobile_tips.find(
        {"creator_id": user_id, "created_at": {"$gte": month_start.isoformat()}}
    ).to_list(1000)
    monthly_earned = sum(t.get("creator_amount", 0) for t in month_tips)

    return {"success": True, "data": {
        "total_earned": earnings.get("total_earned", 0),
        "available_balance": earnings.get("available_balance", 0),
        "total_withdrawn": earnings.get("total_withdrawn", 0),
        "total_tips": earnings.get("total_tips", 0),
        "monthly_earned": monthly_earned,
        "monthly_tips": len(month_tips),
        "recent_tips": recent_tips,
    }}

@app.post("/api/mobile/creator/withdraw")
async def creator_withdraw(data: WithdrawRequest, user_id: str = Depends(verify_token)):
    """Retrait vers Mobile Money"""
    if data.amount < 500:
        raise HTTPException(status_code=400, detail="Montant minimum de retrait: 500 FCFA")

    db = client[DB_NAME]
    earnings = await db.creator_earnings.find_one({"user_id": user_id})
    if not earnings or earnings.get("available_balance", 0) < data.amount:
        raise HTTPException(status_code=400, detail="Solde créateur insuffisant")

    withdrawal_id = str(uuid.uuid4())
    withdrawal_fee = data.amount * 0.02  # 2% frais de retrait
    net_amount = data.amount - withdrawal_fee

    withdrawal = {
        "id": withdrawal_id, "user_id": user_id, "amount": data.amount,
        "net_amount": net_amount, "fee": withdrawal_fee,
        "payment_method": data.payment_method, "phone": data.phone,
        "full_name": data.full_name, "status": "completed",
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.mobile_withdrawals.insert_one(withdrawal)

    await db.creator_earnings.update_one(
        {"user_id": user_id},
        {"$inc": {"available_balance": -data.amount, "total_withdrawn": data.amount}}
    )

    return {"success": True, "data": {
        "withdrawal_id": withdrawal_id, "amount": data.amount,
        "net_amount": net_amount, "fee": withdrawal_fee,
        "method": data.payment_method, "phone": data.phone,
        "status": "completed"
    }}

@app.get("/api/mobile/creator/transactions")
async def get_creator_transactions(user_id: str = Depends(verify_token), page: int = 1, limit: int = 20):
    """Historique des transactions créateur"""
    db = client[DB_NAME]
    skip = (page - 1) * limit
    tips = await db.mobile_tips.find({"creator_id": user_id}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    withdrawals = await db.mobile_withdrawals.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    transactions = []
    for t in tips:
        t.pop("_id", None)
        transactions.append({**t, "tx_type": "tip_received"})
    for w in withdrawals:
        w.pop("_id", None)
        transactions.append({**w, "tx_type": "withdrawal"})

    transactions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"success": True, "data": {"transactions": transactions[:limit], "page": page}}

# ==================== PHASE 2: PUBLICITE PAYANTE (AFRIWONDER ADS) ====================

class CreateAdRequest(BaseModel):
    title: str
    description: str
    media_url: Optional[str] = None
    video_id: Optional[str] = None
    target_audience: Optional[dict] = None  # {region, age_min, age_max, interests}
    budget: float
    duration_days: int = 7
    payment_method: str = "orange-money"
    cta_text: Optional[str] = "En savoir plus"
    cta_url: Optional[str] = None

@app.post("/api/mobile/ads/create")
async def create_ad(data: CreateAdRequest, user_id: str = Depends(verify_token)):
    """Créer une publicité payante"""
    if data.budget < 1000:
        raise HTTPException(status_code=400, detail="Budget minimum: 1,000 FCFA")
    if data.duration_days < 1 or data.duration_days > 90:
        raise HTTPException(status_code=400, detail="Durée: entre 1 et 90 jours")

    db = client[DB_NAME]
    ad_id = str(uuid.uuid4())
    daily_budget = data.budget / data.duration_days

    ad = {
        "id": ad_id, "advertiser_id": user_id,
        "title": data.title, "description": data.description,
        "media_url": data.media_url, "video_id": data.video_id,
        "target_audience": data.target_audience or {"region": "Mali", "age_min": 18, "age_max": 65},
        "budget": data.budget, "spent": 0, "daily_budget": daily_budget,
        "duration_days": data.duration_days,
        "start_date": datetime.utcnow().isoformat(),
        "end_date": (datetime.utcnow() + timedelta(days=data.duration_days)).isoformat(),
        "payment_method": data.payment_method,
        "cta_text": data.cta_text, "cta_url": data.cta_url,
        "status": "active",
        "impressions": 0, "clicks": 0, "engagement_rate": 0,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.mobile_ads.insert_one(ad)
    ad.pop("_id", None)

    return {"success": True, "data": ad}

@app.get("/api/mobile/ads/my")
async def get_my_ads(user_id: str = Depends(verify_token)):
    """Mes publicités"""
    db = client[DB_NAME]
    ads = await db.mobile_ads.find({"advertiser_id": user_id}).sort("created_at", -1).to_list(50)
    for a in ads:
        a.pop("_id", None)
    return {"success": True, "data": ads}

@app.get("/api/mobile/ads/feed")
async def get_feed_ads(user_id: str = Depends(verify_token)):
    """Publicités à injecter dans le feed"""
    db = client[DB_NAME]
    active_ads = await db.mobile_ads.find({"status": "active"}).to_list(10)
    for a in active_ads:
        a.pop("_id", None)
        # Increment impressions
        await db.mobile_ads.update_one({"id": a["id"]}, {"$inc": {"impressions": 1}})
    return {"success": True, "data": active_ads}

@app.post("/api/mobile/ads/{ad_id}/click")
async def record_ad_click(ad_id: str, user_id: str = Depends(verify_token)):
    """Enregistrer un clic sur une pub"""
    db = client[DB_NAME]
    await db.mobile_ads.update_one({"id": ad_id}, {"$inc": {"clicks": 1}})
    return {"success": True}

# ==================== PHASE 3: LIVE STREAMING ====================

class StartLiveRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = None

class ClipHighlightRequest(BaseModel):
    live_id: str
    start_time: float  # seconds
    end_time: float    # seconds
    title: Optional[str] = None

@app.post("/api/mobile/live/start")
async def start_live(data: StartLiveRequest, user_id: str = Depends(verify_token)):
    """Démarrer un live"""
    db = client[DB_NAME]
    live_id = str(uuid.uuid4())

    live = {
        "id": live_id, "creator_id": user_id,
        "title": data.title, "description": data.description or "",
        "category": data.category or "general",
        "thumbnail_url": data.thumbnail_url or f"https://i.pravatar.cc/600?u={live_id}",
        "status": "live",
        "viewer_count": 0, "peak_viewers": 0,
        "total_tips": 0, "tip_amount": 0,
        "likes": 0, "comments_count": 0,
        "recording_url": None,
        "duration": 0,
        "started_at": datetime.utcnow().isoformat(),
        "ended_at": None,
        "highlights": [],
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.mobile_lives.insert_one(live)

    return {"success": True, "data": {"live_id": live_id, "status": "live", "stream_key": f"afri-{live_id[:8]}"}}

@app.post("/api/mobile/live/{live_id}/end")
async def end_live(live_id: str, user_id: str = Depends(verify_token)):
    """Terminer un live — le replay reste enregistré"""
    db = client[DB_NAME]
    live = await db.mobile_lives.find_one({"id": live_id, "creator_id": user_id})
    if not live:
        raise HTTPException(status_code=404, detail="Live non trouvé")

    started = datetime.fromisoformat(live["started_at"])
    duration = (datetime.utcnow() - started).total_seconds()
    recording_url = f"https://cdn.afriwonder.com/lives/{live_id}/replay.mp4"

    await db.mobile_lives.update_one(
        {"id": live_id},
        {"$set": {
            "status": "ended", "ended_at": datetime.utcnow().isoformat(),
            "duration": duration, "recording_url": recording_url,
        }}
    )

    return {"success": True, "data": {"live_id": live_id, "status": "ended", "duration": duration, "recording_url": recording_url}}

@app.get("/api/mobile/live/active")
async def get_active_lives(user_id: str = Depends(verify_token)):
    """Lives en cours"""
    db = client[DB_NAME]
    lives = await db.mobile_lives.find({"status": "live"}).sort("started_at", -1).to_list(20)
    for l in lives:
        l.pop("_id", None)
    return {"success": True, "data": lives}

@app.get("/api/mobile/live/replays")
async def get_live_replays(user_id: str = Depends(verify_token)):
    """Replays de lives terminés"""
    db = client[DB_NAME]
    replays = await db.mobile_lives.find({"status": "ended"}).sort("ended_at", -1).to_list(30)
    for r in replays:
        r.pop("_id", None)
    return {"success": True, "data": replays}

@app.get("/api/mobile/live/{live_id}")
async def get_live_details(live_id: str, user_id: str = Depends(verify_token)):
    """Détails d'un live"""
    db = client[DB_NAME]
    live = await db.mobile_lives.find_one({"id": live_id})
    if not live:
        raise HTTPException(status_code=404, detail="Live non trouvé")
    live.pop("_id", None)
    return {"success": True, "data": live}

@app.post("/api/mobile/live/{live_id}/highlight")
async def create_highlight(live_id: str, data: ClipHighlightRequest, user_id: str = Depends(verify_token)):
    """Découper un moment fort du live pour le reposter"""
    db = client[DB_NAME]
    live = await db.mobile_lives.find_one({"id": live_id, "creator_id": user_id})
    if not live:
        raise HTTPException(status_code=404, detail="Live non trouvé")
    if live.get("status") != "ended":
        raise HTTPException(status_code=400, detail="Le live doit être terminé pour créer un highlight")

    clip_id = str(uuid.uuid4())
    clip_url = f"https://cdn.afriwonder.com/lives/{live_id}/clips/{clip_id}.mp4"

    highlight = {
        "id": clip_id, "live_id": live_id, "creator_id": user_id,
        "title": data.title or f"Moment fort - {live.get('title', '')}",
        "start_time": data.start_time, "end_time": data.end_time,
        "duration": data.end_time - data.start_time,
        "clip_url": clip_url,
        "views": 0, "likes": 0,
        "status": "ready",
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.mobile_highlights.insert_one(highlight)
    highlight.pop("_id", None)
    await db.mobile_lives.update_one(
        {"id": live_id},
        {"$push": {"highlights": {"id": clip_id, "title": highlight["title"], "clip_url": clip_url}}}
    )

    return {"success": True, "data": highlight}

@app.post("/api/mobile/live/{live_id}/tip")
async def tip_during_live(live_id: str, data: TipRequest, user_id: str = Depends(verify_token)):
    """Envoyer un pourboire pendant un live"""
    db = client[DB_NAME]
    live = await db.mobile_lives.find_one({"id": live_id})
    if not live:
        raise HTTPException(status_code=404, detail="Live non trouvé")

    # Use existing tip logic
    data.creator_id = live["creator_id"]
    data.video_id = live_id
    result = await send_tip(data, user_id)

    # Update live tip stats
    await db.mobile_lives.update_one(
        {"id": live_id},
        {"$inc": {"total_tips": 1, "tip_amount": data.amount}}
    )

    return result

# ==================== PHASE 4: UPLOAD VIDEOS LONGUES ====================

@app.post("/api/mobile/upload/chunk")
async def upload_chunk(
    chunk: UploadFile = File(...),
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    filename: str = Form("video.mp4"),
    user_id: str = Depends(verify_token),
):
    """Upload vidéo par morceaux (chunked) pour les vidéos longues"""
    upload_dir = f"/app/backend/uploads/chunks/{upload_id}"
    os.makedirs(upload_dir, exist_ok=True)

    chunk_path = os.path.join(upload_dir, f"chunk_{chunk_index:04d}")
    async with aiofiles.open(chunk_path, "wb") as f:
        content = await chunk.read()
        await f.write(content)

    # Check if all chunks are uploaded
    uploaded_chunks = len([f for f in os.listdir(upload_dir) if f.startswith("chunk_")])

    if uploaded_chunks >= total_chunks:
        # Assemble all chunks
        final_dir = "/app/backend/uploads/videos"
        os.makedirs(final_dir, exist_ok=True)
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "mp4"
        final_path = f"{final_dir}/{upload_id}.{ext}"

        async with aiofiles.open(final_path, "wb") as out_f:
            for i in range(total_chunks):
                cp = os.path.join(upload_dir, f"chunk_{i:04d}")
                if os.path.exists(cp):
                    async with aiofiles.open(cp, "rb") as cf:
                        await out_f.write(await cf.read())

        # Cleanup chunks
        import shutil
        shutil.rmtree(upload_dir, ignore_errors=True)

        file_size = os.path.getsize(final_path)
        return {
            "success": True,
            "data": {
                "upload_id": upload_id,
                "status": "complete",
                "file_url": f"/api/uploads/videos/{upload_id}.{ext}",
                "file_size": file_size,
                "chunks_received": total_chunks,
            }
        }

    return {
        "success": True,
        "data": {
            "upload_id": upload_id,
            "status": "uploading",
            "chunks_received": uploaded_chunks,
            "total_chunks": total_chunks,
            "progress": round(uploaded_chunks / total_chunks * 100, 1),
        }
    }

@app.get("/api/mobile/upload/{upload_id}/status")
async def get_upload_status(upload_id: str, user_id: str = Depends(verify_token)):
    """Vérifier le statut d'un upload chunked"""
    upload_dir = f"/app/backend/uploads/chunks/{upload_id}"
    final_dir = "/app/backend/uploads/videos"

    # Check if complete
    for ext in ["mp4", "mov", "avi"]:
        fp = f"{final_dir}/{upload_id}.{ext}"
        if os.path.exists(fp):
            return {"success": True, "data": {"upload_id": upload_id, "status": "complete", "file_url": f"/api/uploads/videos/{upload_id}.{ext}"}}

    # Check chunks progress
    if os.path.exists(upload_dir):
        chunks = len([f for f in os.listdir(upload_dir) if f.startswith("chunk_")])
        return {"success": True, "data": {"upload_id": upload_id, "status": "uploading", "chunks_received": chunks}}

    return {"success": True, "data": {"upload_id": upload_id, "status": "not_found"}}

# ==================== SEED DATA FOR NEW FEATURES ====================

@app.on_event("startup")
async def seed_monetization_data():
    """Seed demo data for monetization, ads, lives"""
    db = client[DB_NAME]

    # Seed sample ads
    ad_count = await db.mobile_ads.count_documents({})
    if ad_count == 0:
        sample_ads = [
            {
                "id": str(uuid.uuid4()), "advertiser_id": "demo-advertiser-1",
                "title": "Orange Money Mali", "description": "Envoyez et recevez de l'argent partout au Mali avec Orange Money. Simple, rapide et sécurisé.",
                "media_url": "https://picsum.photos/800/450?random=ad1", "video_id": None,
                "target_audience": {"region": "Mali", "age_min": 18, "age_max": 55, "interests": ["finance", "mobile"]},
                "budget": 500000, "spent": 125000, "daily_budget": 25000,
                "duration_days": 20, "start_date": datetime.utcnow().isoformat(),
                "end_date": (datetime.utcnow() + timedelta(days=20)).isoformat(),
                "payment_method": "orange-money", "cta_text": "Télécharger", "cta_url": "https://orangemoney.ml",
                "status": "active", "impressions": 45200, "clicks": 2340, "engagement_rate": 5.2,
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": str(uuid.uuid4()), "advertiser_id": "demo-advertiser-2",
                "title": "Marché AfriWonder", "description": "Découvrez les meilleurs produits artisanaux africains. Mode, décoration, cuisine - tout est sur AfriWonder Market.",
                "media_url": "https://picsum.photos/800/450?random=ad2", "video_id": None,
                "target_audience": {"region": "Afrique de l'Ouest", "age_min": 16, "age_max": 45, "interests": ["shopping", "mode"]},
                "budget": 250000, "spent": 80000, "daily_budget": 15000,
                "duration_days": 14, "start_date": datetime.utcnow().isoformat(),
                "end_date": (datetime.utcnow() + timedelta(days=14)).isoformat(),
                "payment_method": "wave", "cta_text": "Explorer", "cta_url": None,
                "status": "active", "impressions": 28500, "clicks": 1820, "engagement_rate": 6.4,
                "created_at": datetime.utcnow().isoformat(),
            },
        ]
        for ad in sample_ads:
            await db.mobile_ads.insert_one(ad)

    # Seed sample live replays
    live_count = await db.mobile_lives.count_documents({})
    if live_count == 0:
        sample_lives = [
            {
                "id": str(uuid.uuid4()), "creator_id": "demo-creator-1",
                "title": "Cours de danse Mandingue", "description": "Apprenez les pas de base de la danse Mandingue avec Aminata",
                "category": "culture", "thumbnail_url": "https://picsum.photos/400/600?random=live1",
                "status": "ended", "viewer_count": 0, "peak_viewers": 1250,
                "total_tips": 45, "tip_amount": 67500, "likes": 3200, "comments_count": 890,
                "recording_url": "https://cdn.afriwonder.com/lives/demo1/replay.mp4",
                "duration": 3600, "started_at": (datetime.utcnow() - timedelta(hours=5)).isoformat(),
                "ended_at": (datetime.utcnow() - timedelta(hours=4)).isoformat(),
                "highlights": [
                    {"id": "h1", "title": "Pas de base Mandingue", "clip_url": "https://cdn.afriwonder.com/lives/demo1/clips/h1.mp4"},
                    {"id": "h2", "title": "Freestyle final", "clip_url": "https://cdn.afriwonder.com/lives/demo1/clips/h2.mp4"},
                ],
                "created_at": (datetime.utcnow() - timedelta(hours=5)).isoformat(),
            },
            {
                "id": str(uuid.uuid4()), "creator_id": "demo-creator-2",
                "title": "Concert live - Salif Keita tribute", "description": "Hommage au maestro de la musique malienne",
                "category": "musique", "thumbnail_url": "https://picsum.photos/400/600?random=live2",
                "status": "live", "viewer_count": 342, "peak_viewers": 342,
                "total_tips": 12, "tip_amount": 25000, "likes": 890, "comments_count": 234,
                "recording_url": None, "duration": 0,
                "started_at": (datetime.utcnow() - timedelta(minutes=45)).isoformat(),
                "ended_at": None, "highlights": [],
                "created_at": (datetime.utcnow() - timedelta(minutes=45)).isoformat(),
            },
        ]
        for live in sample_lives:
            await db.mobile_lives.insert_one(live)


# ==================== NOTIFICATIONS ====================

class RegisterDeviceRequest(BaseModel):
    push_token: str
    platform: str = "expo"  # expo, ios, android

@app.post("/api/mobile/notifications/register")
async def register_device(data: RegisterDeviceRequest, user_id: str = Depends(verify_token)):
    """Enregistrer le token push d'un appareil"""
    await db.mobile_devices.update_one(
        {"user_id": user_id},
        {"$set": {"push_token": data.push_token, "platform": data.platform, "updated_at": datetime.utcnow().isoformat()}},
        upsert=True
    )
    return {"success": True}

@app.get("/api/mobile/notifications")
async def get_notifications(user_id: str = Depends(verify_token), page: int = 1, limit: int = 30):
    """Récupérer les notifications"""
    skip = (page - 1) * limit
    notifs = await db.mobile_notifications.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for n in notifs:
        n.pop("_id", None)
    unread = await db.mobile_notifications.count_documents({"user_id": user_id, "is_read": False})
    return {"success": True, "data": {"notifications": notifs, "unread_count": unread}}

@app.post("/api/mobile/notifications/read")
async def mark_notifications_read(user_id: str = Depends(verify_token)):
    """Marquer toutes les notifications comme lues"""
    result = await db.mobile_notifications.update_many({"user_id": user_id, "is_read": False}, {"$set": {"is_read": True}})
    return {"success": True, "data": {"message": "Toutes les notifications ont été marquées comme lues", "updated_count": result.modified_count}}

async def create_notification(user_id: str, notif_type: str, title: str, body: str, data: dict = None):
    """Helper: créer une notification"""
    notif = {
        "id": str(uuid.uuid4()), "user_id": user_id, "type": notif_type,
        "title": title, "body": body, "data": data or {},
        "is_read": False, "created_at": datetime.utcnow().isoformat(),
    }
    await db.mobile_notifications.insert_one(notif)

# ==================== RECHERCHE GLOBALE ====================

@app.get("/api/mobile/search")
async def global_search(q: str, user_id: str = Depends(verify_token), search_type: str = "all"):
    """Recherche globale : utilisateurs, vidéos, produits, hashtags"""
    results = {"users": [], "videos": [], "products": [], "hashtags": [], "posts": []}
    query_lower = q.lower()

    # Search PWA backend for users, videos, products
    async with httpx.AsyncClient(timeout=15.0) as hc:
        if search_type in ["all", "users"]:
            try:
                r = await hc.get(f"{PWA_API_BASE}/users?search={q}&limit=10", headers=PWA_ANTI_BOT_HEADERS)
                if r.status_code == 200:
                    data = r.json().get("data", {})
                    results["users"] = data.get("users", [])[:10]
            except: pass

        if search_type in ["all", "videos"]:
            try:
                r = await hc.get(f"{PWA_API_BASE}/videos?search={q}&limit=10", headers=PWA_ANTI_BOT_HEADERS)
                if r.status_code == 200:
                    data = r.json().get("data", {})
                    results["videos"] = data.get("videos", [])[:10]
            except: pass

        if search_type in ["all", "products"]:
            try:
                r = await hc.get(f"{PWA_API_BASE}/products?search={q}&limit=10", headers=PWA_ANTI_BOT_HEADERS)
                if r.status_code == 200:
                    data = r.json().get("data", {})
                    results["products"] = data.get("products", [])[:10]
            except: pass

    # Search local posts
    if search_type in ["all", "posts"]:
        posts = await db.mobile_posts.find({"$or": [
            {"text": {"$regex": q, "$options": "i"}},
            {"title": {"$regex": q, "$options": "i"}},
            {"hashtags": {"$regex": q, "$options": "i"}},
        ]}).limit(10).to_list(10)
        for p in posts:
            p.pop("_id", None)
        results["posts"] = posts

    # Extract hashtags from results
    all_tags = set()
    for v in results.get("videos", []):
        for tag in v.get("hashtags", []):
            if query_lower in tag.lower():
                all_tags.add(tag)
    results["hashtags"] = list(all_tags)[:10]

    return {"success": True, "data": results}

# ==================== FOLLOW / ABONNÉS ====================

@app.post("/api/mobile/follow/{target_id}")
async def follow_user(target_id: str, user_id: str = Depends(verify_token)):
    """Suivre un utilisateur"""
    if target_id == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous suivre vous-même")
    existing = await db.mobile_follows.find_one({"follower_id": user_id, "following_id": target_id})
    if existing:
        raise HTTPException(status_code=400, detail="Déjà abonné")

    await db.mobile_follows.insert_one({
        "id": str(uuid.uuid4()), "follower_id": user_id, "following_id": target_id,
        "created_at": datetime.utcnow().isoformat(),
    })
    # Notify
    await create_notification(target_id, "follow", "Nouvel abonné", "Quelqu'un vous suit", {"follower_id": user_id})
    return {"success": True, "data": {"following": True}}

@app.delete("/api/mobile/follow/{target_id}")
async def unfollow_user(target_id: str, user_id: str = Depends(verify_token)):
    """Se désabonner d'un utilisateur"""
    await db.mobile_follows.delete_one({"follower_id": user_id, "following_id": target_id})
    return {"success": True, "data": {"following": False}}

@app.get("/api/mobile/follow/{target_id}/status")
async def follow_status(target_id: str, user_id: str = Depends(verify_token)):
    """Vérifier si on suit un utilisateur"""
    existing = await db.mobile_follows.find_one({"follower_id": user_id, "following_id": target_id})
    return {"success": True, "data": {"following": bool(existing)}}

@app.get("/api/mobile/followers/{target_id}")
async def get_followers(target_id: str, user_id: str = Depends(verify_token)):
    """Liste des abonnés"""
    followers = await db.mobile_follows.find({"following_id": target_id}).to_list(100)
    count = len(followers)
    return {"success": True, "data": {"count": count, "followers": [f["follower_id"] for f in followers]}}

@app.get("/api/mobile/following/{target_id}")
async def get_following(target_id: str, user_id: str = Depends(verify_token)):
    """Liste des abonnements"""
    following = await db.mobile_follows.find({"follower_id": target_id}).to_list(100)
    count = len(following)
    return {"success": True, "data": {"count": count, "following": [f["following_id"] for f in following]}}

# ==================== SIGNALER / BLOQUER ====================

class ReportRequest(BaseModel):
    target_type: str  # user, video, post, comment, message
    target_id: str
    reason: str  # spam, harassment, nudity, violence, scam, other
    description: Optional[str] = None

class BlockRequest(BaseModel):
    blocked_user_id: str

@app.post("/api/mobile/report")
async def report_content(data: ReportRequest, user_id: str = Depends(verify_token)):
    """Signaler du contenu inapproprié"""
    report = {
        "id": str(uuid.uuid4()), "reporter_id": user_id,
        "target_type": data.target_type, "target_id": data.target_id,
        "reason": data.reason, "description": data.description,
        "status": "pending", "created_at": datetime.utcnow().isoformat(),
    }
    await db.mobile_reports.insert_one(report)
    return {"success": True, "data": {"report_id": report["id"], "message": "Merci pour votre signalement. Notre équipe va examiner ce contenu."}}

@app.post("/api/mobile/block")
async def block_user(data: BlockRequest, user_id: str = Depends(verify_token)):
    """Bloquer un utilisateur"""
    if data.blocked_user_id == user_id:
        raise HTTPException(status_code=400, detail="Action invalide")
    await db.mobile_blocks.update_one(
        {"blocker_id": user_id, "blocked_id": data.blocked_user_id},
        {"$set": {"created_at": datetime.utcnow().isoformat()}},
        upsert=True
    )
    # Auto unfollow
    await db.mobile_follows.delete_one({"follower_id": user_id, "following_id": data.blocked_user_id})
    await db.mobile_follows.delete_one({"follower_id": data.blocked_user_id, "following_id": user_id})
    return {"success": True, "data": {"message": "Utilisateur bloqué"}}

@app.delete("/api/mobile/block/{blocked_id}")
async def unblock_user(blocked_id: str, user_id: str = Depends(verify_token)):
    """Débloquer un utilisateur"""
    await db.mobile_blocks.delete_one({"blocker_id": user_id, "blocked_id": blocked_id})
    return {"success": True, "data": {"message": "Utilisateur débloqué"}}

@app.get("/api/mobile/blocked")
async def get_blocked_users(user_id: str = Depends(verify_token)):
    """Liste des utilisateurs bloqués"""
    blocks = await db.mobile_blocks.find({"blocker_id": user_id}).to_list(100)
    return {"success": True, "data": [b["blocked_id"] for b in blocks]}

# ==================== USER INTERESTS ====================
class InterestsRequest(BaseModel):
    interests: List[str]

@app.post("/api/mobile/interests")
async def save_user_interests(data: InterestsRequest, user_id: str = Depends(verify_token)):
    """Sauvegarder les centres d'intérêt de l'utilisateur"""
    await db.mobile_user_interests.update_one(
        {"user_id": user_id},
        {"$set": {"interests": data.interests, "updated_at": datetime.utcnow().isoformat()}},
        upsert=True
    )
    return {"success": True, "data": {"message": "Centres d'intérêt sauvegardés", "interests": data.interests}}

@app.get("/api/mobile/interests")
async def get_user_interests(user_id: str = Depends(verify_token)):
    """Récupérer les centres d'intérêt de l'utilisateur"""
    user_interests = await db.mobile_user_interests.find_one({"user_id": user_id})
    if user_interests:
        interests = user_interests.get("interests", [])
    else:
        # Default interests if none saved
        interests = []
    return {"success": True, "data": {"interests": interests}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
