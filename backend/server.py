"""
AfriWonder Backend - APIs Complémentaires Mobile
Le backend PWA (afriwonder.onrender.com) gère: auth, vidéos, produits, notifications, users
Ce backend gère les fonctionnalités mobile-spécifiques: messaging, wallet, upload
"""

from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Form
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
