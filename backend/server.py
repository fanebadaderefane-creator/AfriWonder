"""
AfriWonder Backend API Mock
This mock API replicates the structure of the AfriWonder production API
for development and testing purposes.
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

load_dotenv()

app = FastAPI(
    title="AfriWonder API Mock",
    description="Mock API for AfriWonder mobile app development",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "afriwonder-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# In-memory storage (for development)
users_db = {}
videos_db = {}
products_db = {}
carts_db = {}
comments_db = {}
notifications_db = {}

# Initialize mock data
def init_mock_data():
    # Mock users
    users_db["user1"] = {
        "id": "user1",
        "email": "aminata@afriwonder.com",
        "password": hashlib.sha256("password123".encode()).hexdigest(),
        "firstName": "Aminata",
        "lastName": "Diallo",
        "phone": "+22370123456",
        "country": "ML",
        "avatar": "https://i.pravatar.cc/150?img=1",
        "bio": "Danseuse traditionnelle malienne 💃",
        "followers": 12500,
        "following": 345,
        "videosCount": 48,
        "createdAt": datetime.now().isoformat()
    }
    
    users_db["user2"] = {
        "id": "user2",
        "email": "moussa@afriwonder.com",
        "password": hashlib.sha256("password123".encode()).hexdigest(),
        "firstName": "Moussa",
        "lastName": "Ndiaye",
        "phone": "+221771234567",
        "country": "SN",
        "avatar": "https://i.pravatar.cc/150?img=2",
        "bio": "Chef cuisinier - Cuisine sénégalaise 🍳",
        "followers": 8900,
        "following": 212,
        "videosCount": 35,
        "createdAt": datetime.now().isoformat()
    }

    # Mock videos
    videos_db["v1"] = {
        "id": "v1",
        "title": "Danse traditionnelle malienne",
        "description": "Magnifique danse au coucher du soleil #Mali #Culture #Danse",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "thumbnailUrl": "https://picsum.photos/400/800?random=1",
        "duration": 45,
        "views": 125000,
        "likes": 8500,
        "comments": 342,
        "shares": 89,
        "hashtags": ["Mali", "Culture", "Danse"],
        "userId": "user1",
        "createdAt": datetime.now().isoformat()
    }
    
    videos_db["v2"] = {
        "id": "v2",
        "title": "Street food Dakar",
        "description": "Les meilleurs thieboudienne de Dakar! 🍚 #Senegal #Food #Dakar",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "thumbnailUrl": "https://picsum.photos/400/800?random=2",
        "duration": 60,
        "views": 89000,
        "likes": 6200,
        "comments": 178,
        "shares": 45,
        "hashtags": ["Senegal", "Food", "Dakar"],
        "userId": "user2",
        "createdAt": datetime.now().isoformat()
    }

    videos_db["v3"] = {
        "id": "v3",
        "title": "Mode africaine",
        "description": "Nouvelle collection Bogolan 🌟 #CoteDIvoire #Fashion #Bogolan",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "thumbnailUrl": "https://picsum.photos/400/800?random=3",
        "duration": 30,
        "views": 234000,
        "likes": 18900,
        "comments": 892,
        "shares": 234,
        "hashtags": ["CoteDIvoire", "Fashion", "Bogolan"],
        "userId": "user1",
        "createdAt": datetime.now().isoformat()
    }

    # Mock products
    products_db["p1"] = {
        "id": "p1",
        "name": "Robe Bogolan",
        "description": "Magnifique robe en tissu bogolan authentique du Mali",
        "price": 25000,
        "currency": "FCFA",
        "images": ["https://picsum.photos/300/400?random=20"],
        "category": "Mode",
        "rating": 4.8,
        "reviews": 124,
        "sellerId": "user1",
        "sellerName": "Awa Mode",
        "inStock": True,
        "createdAt": datetime.now().isoformat()
    }
    
    products_db["p2"] = {
        "id": "p2",
        "name": "Téléphone Samsung A54",
        "description": "Samsung Galaxy A54 5G, 128GB, Noir",
        "price": 185000,
        "currency": "FCFA",
        "images": ["https://picsum.photos/300/400?random=21"],
        "category": "Électronique",
        "rating": 4.5,
        "reviews": 89,
        "sellerId": "user2",
        "sellerName": "Tech Mali",
        "inStock": True,
        "createdAt": datetime.now().isoformat()
    }

init_mock_data()

# Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    phone: str
    password: str
    country: str

class RefreshTokenRequest(BaseModel):
    refreshToken: str

class CommentRequest(BaseModel):
    text: str

class CartItemRequest(BaseModel):
    productId: str
    quantity: int = 1

class CheckoutRequest(BaseModel):
    paymentMethod: str  # orange-money, wave, mtn, stripe
    phone: Optional[str] = None
    addressLine1: str
    city: str
    country: str

# Helper functions
def create_tokens(user_id: str):
    access_payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "type": "access"
    }
    refresh_payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=30),
        "type": "refresh"
    }
    access_token = jwt.encode(access_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return access_token, refresh_token

def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token manquant")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

def get_user_safe(user_id: str):
    user = users_db.get(user_id)
    if user:
        return {k: v for k, v in user.items() if k != "password"}
    return None

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "AfriWonder API Mock", "version": "1.0.0"}

# ==================== AUTH ENDPOINTS ====================

@app.post("/api/auth/register")
async def register(data: RegisterRequest):
    # Check if email exists
    for user in users_db.values():
        if user["email"] == data.email:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_id = str(uuid.uuid4())
    users_db[user_id] = {
        "id": user_id,
        "email": data.email,
        "password": hashlib.sha256(data.password.encode()).hexdigest(),
        "firstName": data.firstName,
        "lastName": data.lastName,
        "phone": data.phone,
        "country": data.country,
        "avatar": f"https://i.pravatar.cc/150?u={user_id}",
        "bio": "",
        "followers": 0,
        "following": 0,
        "videosCount": 0,
        "createdAt": datetime.now().isoformat()
    }
    
    access_token, refresh_token = create_tokens(user_id)
    return {
        "user": get_user_safe(user_id),
        "accessToken": access_token,
        "refreshToken": refresh_token
    }

@app.post("/api/auth/login")
async def login(data: LoginRequest):
    password_hash = hashlib.sha256(data.password.encode()).hexdigest()
    
    for user_id, user in users_db.items():
        if user["email"] == data.email and user["password"] == password_hash:
            access_token, refresh_token = create_tokens(user_id)
            return {
                "user": get_user_safe(user_id),
                "accessToken": access_token,
                "refreshToken": refresh_token
            }
    
    raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

@app.post("/api/auth/refresh")
async def refresh_token(data: RefreshTokenRequest):
    try:
        payload = jwt.decode(data.refreshToken, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token invalide")
        
        user_id = payload["user_id"]
        if user_id not in users_db:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        
        access_token, refresh_token = create_tokens(user_id)
        return {
            "accessToken": access_token,
            "refreshToken": refresh_token
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

@app.get("/api/auth/me")
async def get_me(user_id: str = Depends(verify_token)):
    user = get_user_safe(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user

@app.post("/api/auth/logout")
async def logout(user_id: str = Depends(verify_token)):
    return {"message": "Déconnexion réussie"}

# ==================== VIDEOS ENDPOINTS ====================

@app.get("/api/videos/feed")
async def get_feed(page: int = 1, limit: int = 10):
    videos_list = list(videos_db.values())
    start = (page - 1) * limit
    end = start + limit
    paginated = videos_list[start:end]
    
    # Enrich with user data
    enriched = []
    for video in paginated:
        user = get_user_safe(video["userId"])
        enriched.append({
            **video,
            "isLiked": False,
            "isSaved": False,
            "user": {
                "id": user["id"],
                "firstName": user["firstName"],
                "lastName": user["lastName"],
                "avatar": user["avatar"],
                "isFollowing": False
            }
        })
    
    return {
        "videos": enriched,
        "page": page,
        "totalPages": (len(videos_list) + limit - 1) // limit,
        "hasMore": end < len(videos_list)
    }

@app.get("/api/videos/trending")
async def get_trending():
    return {
        "hashtags": ["MaliDance", "AfriFood", "DakarLife", "Bogolan", "AfroBeats", "SahelVibes"],
        "videos": list(videos_db.values())[:6]
    }

@app.get("/api/videos/{video_id}")
async def get_video(video_id: str):
    video = videos_db.get(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    
    user = get_user_safe(video["userId"])
    return {
        **video,
        "isLiked": False,
        "isSaved": False,
        "user": {
            "id": user["id"],
            "firstName": user["firstName"],
            "lastName": user["lastName"],
            "avatar": user["avatar"],
            "isFollowing": False
        }
    }

@app.post("/api/videos/{video_id}/like")
async def like_video(video_id: str, user_id: str = Depends(verify_token)):
    video = videos_db.get(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    
    # Toggle like (simplified)
    video["likes"] += 1
    return {"liked": True, "likes": video["likes"]}

@app.post("/api/videos/{video_id}/save")
async def save_video(video_id: str, user_id: str = Depends(verify_token)):
    video = videos_db.get(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    return {"saved": True}

@app.get("/api/videos/{video_id}/comments")
async def get_comments(video_id: str, page: int = 1):
    video_comments = [c for c in comments_db.values() if c["videoId"] == video_id]
    
    # Add mock comments if empty
    if not video_comments:
        video_comments = [
            {
                "id": f"c{i}",
                "text": ["Super vidéo! 🔥", "J'adore!", "Magnifique 👏", "Génial!", "Trop bien!"][i % 5],
                "videoId": video_id,
                "userId": "user1",
                "likes": 10 + i * 3,
                "isLiked": False,
                "createdAt": datetime.now().isoformat()
            }
            for i in range(5)
        ]
    
    enriched = []
    for comment in video_comments:
        user = get_user_safe(comment["userId"]) or users_db.get("user1")
        enriched.append({
            **comment,
            "user": {
                "id": user["id"],
                "firstName": user["firstName"],
                "lastName": user["lastName"],
                "avatar": user["avatar"]
            }
        })
    
    return {"comments": enriched, "hasMore": False}

@app.post("/api/videos/{video_id}/comment")
async def add_comment(video_id: str, data: CommentRequest, user_id: str = Depends(verify_token)):
    video = videos_db.get(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    
    comment_id = str(uuid.uuid4())
    comment = {
        "id": comment_id,
        "text": data.text,
        "videoId": video_id,
        "userId": user_id,
        "likes": 0,
        "isLiked": False,
        "createdAt": datetime.now().isoformat()
    }
    comments_db[comment_id] = comment
    video["comments"] += 1
    
    user = get_user_safe(user_id)
    return {
        **comment,
        "user": {
            "id": user["id"],
            "firstName": user["firstName"],
            "lastName": user["lastName"],
            "avatar": user["avatar"]
        }
    }

# ==================== SEARCH ENDPOINT ====================

@app.get("/api/search")
async def search(q: str, type: str = "videos"):
    results = []
    query = q.lower()
    
    if type == "videos":
        for video in videos_db.values():
            if query in video["title"].lower() or query in video["description"].lower():
                results.append(video)
    elif type == "users":
        for user in users_db.values():
            if query in user["firstName"].lower() or query in user["lastName"].lower():
                results.append(get_user_safe(user["id"]))
    elif type == "products":
        for product in products_db.values():
            if query in product["name"].lower() or query in product["description"].lower():
                results.append(product)
    
    return {"results": results, "type": type, "query": q}

# ==================== USERS ENDPOINTS ====================

@app.get("/api/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    user = get_user_safe(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user

@app.put("/api/users/{user_id}/profile")
async def update_profile(user_id: str, current_user: str = Depends(verify_token)):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Non autorisé")
    # Update logic here
    return get_user_safe(user_id)

@app.post("/api/users/{user_id}/follow")
async def follow_user(user_id: str, current_user: str = Depends(verify_token)):
    target = users_db.get(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    target["followers"] += 1
    me = users_db.get(current_user)
    if me:
        me["following"] += 1
    
    return {"following": True, "followers": target["followers"]}

# ==================== MARKETPLACE ENDPOINTS ====================

@app.get("/api/marketplace/products")
async def get_products(category: Optional[str] = None, search: Optional[str] = None):
    products = list(products_db.values())
    
    if category:
        products = [p for p in products if p["category"] == category]
    
    if search:
        search_lower = search.lower()
        products = [p for p in products if search_lower in p["name"].lower()]
    
    return {"products": products, "total": len(products)}

@app.get("/api/marketplace/products/{product_id}")
async def get_product(product_id: str):
    product = products_db.get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return product

@app.get("/api/marketplace/cart")
async def get_cart(user_id: str = Depends(verify_token)):
    cart = carts_db.get(user_id, {"items": [], "total": 0})
    return cart

@app.post("/api/marketplace/cart/add")
async def add_to_cart(data: CartItemRequest, user_id: str = Depends(verify_token)):
    product = products_db.get(data.productId)
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    if user_id not in carts_db:
        carts_db[user_id] = {"items": [], "total": 0}
    
    cart = carts_db[user_id]
    
    # Check if already in cart
    existing = next((item for item in cart["items"] if item["productId"] == data.productId), None)
    if existing:
        existing["quantity"] += data.quantity
    else:
        cart["items"].append({
            "productId": data.productId,
            "name": product["name"],
            "price": product["price"],
            "image": product["images"][0],
            "quantity": data.quantity
        })
    
    # Recalculate total
    cart["total"] = sum(item["price"] * item["quantity"] for item in cart["items"])
    
    return cart

@app.post("/api/marketplace/checkout")
async def checkout(data: CheckoutRequest, user_id: str = Depends(verify_token)):
    cart = carts_db.get(user_id)
    if not cart or not cart["items"]:
        raise HTTPException(status_code=400, detail="Panier vide")
    
    order_id = str(uuid.uuid4())[:8].upper()
    
    # Clear cart
    carts_db[user_id] = {"items": [], "total": 0}
    
    return {
        "orderId": order_id,
        "status": "pending",
        "paymentMethod": data.paymentMethod,
        "total": cart["total"],
        "message": f"Commande {order_id} créée. Paiement {data.paymentMethod} en attente."
    }

# ==================== PAYMENTS ENDPOINTS ====================

@app.post("/api/payments/orange-money/initiate")
async def initiate_orange_money(phone: str, amount: int, order_id: str, user_id: str = Depends(verify_token)):
    """Initiate Orange Money payment - sends OTP to user's phone"""
    return {
        "transactionId": str(uuid.uuid4()),
        "status": "otp_sent",
        "message": "Un code OTP a été envoyé au numéro " + phone
    }

@app.post("/api/payments/orange-money/confirm")
async def confirm_orange_money(transaction_id: str, otp: str, user_id: str = Depends(verify_token)):
    """Confirm Orange Money payment with OTP"""
    # In production, this would verify with Orange Money API
    if len(otp) == 6 and otp.isdigit():
        return {
            "status": "success",
            "transactionId": transaction_id,
            "message": "Paiement réussi!"
        }
    raise HTTPException(status_code=400, detail="Code OTP invalide")

# ==================== NOTIFICATIONS ENDPOINTS ====================

@app.get("/api/notifications")
async def get_notifications(user_id: str = Depends(verify_token)):
    # Mock notifications
    return {
        "notifications": [
            {
                "id": "n1",
                "type": "like",
                "message": "Aminata a aimé votre vidéo",
                "read": False,
                "createdAt": datetime.now().isoformat()
            },
            {
                "id": "n2",
                "type": "follow",
                "message": "Moussa vous suit maintenant",
                "read": True,
                "createdAt": datetime.now().isoformat()
            },
            {
                "id": "n3",
                "type": "comment",
                "message": "Nouveau commentaire sur votre vidéo",
                "read": False,
                "createdAt": datetime.now().isoformat()
            }
        ],
        "unreadCount": 2
    }

@app.post("/api/notifications/read")
async def mark_notifications_read(user_id: str = Depends(verify_token)):
    return {"message": "Notifications marquées comme lues"}

# ==================== LIVE STREAMING ENDPOINTS ====================

@app.get("/api/live/streams")
async def get_live_streams():
    return {
        "streams": [
            {
                "id": "live1",
                "title": "Live Dance Mali 🎶",
                "thumbnail": "https://picsum.photos/300/400?random=30",
                "viewers": 234,
                "user": {
                    "id": "user1",
                    "firstName": "Aminata",
                    "lastName": "Diallo",
                    "avatar": "https://i.pravatar.cc/150?img=1"
                }
            }
        ]
    }

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
