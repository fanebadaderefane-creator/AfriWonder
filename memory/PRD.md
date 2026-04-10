# AfriWonder - Product Requirements Document

## Overview
AfriWonder is a comprehensive super-app for the African market (Mali, Senegal, Ivory Coast) built with Expo React Native.

## Architecture
- **Frontend**: Expo (React Native), Expo Router, Zustand, Axios
- **Backend**: External production backend at `https://afri-wonder.vercel.app/api`
- **Database**: External (managed by production backend)

## Screens Built (46 files)

### Core Navigation
- Splash screen with animation
- Onboarding (3 slides)
- Auth (Login, Register with country picker)
- Bottom Tabs (Feed, Explore, Create, Market, Profile)

### Services Ecosystem
- Services Hub (`/services`) - Grid of all services
- Food Delivery (`/services/food`) - Restaurants, categories, search
- Transport (`/services/transport`) - Vehicle types, booking
- Health/Telemedicine (`/services/health`) - Doctors, teleconsultation
- Real Estate (`/services/realestate`) - Properties, filters
- Events (`/services/events`) - Festivals, concerts, tech meetups
- Jobs (`/services/jobs`) - Job listings with filters

### Commerce
- Marketplace (tab) - Product grid
- Product Detail (`/product/[id]`) - Full product page with sizes, colors, seller
- Cart/Checkout (`/cart`) - Cart with Orange Money, Wave, MTN MoMo payments

### Finance
- Wallet (`/wallet`) - Balance, transactions, microcredit, send/receive

### Social & Communication
- Video Feed (TikTok-style swipe)
- Live Streams listing (`/live`)
- Live Stream Viewer (`/live/[id]`) - Real-time chat, gifts
- Start Live (`/live/start`) - Camera preview, categories
- Messages List (`/messages`) - Online users, conversations
- Chat (`/messages/[id]`) - Real-time messaging
- Notifications (`/notifications`) - All notification types

### Content Creation
- Create Tab - Record video, pick from gallery, start live

## Status
- **Frontend**: COMPLETE with mock data (user handles backend connection)
- **Backend connection**: User responsibility
- **Mock data**: YES - all screens use local mock data
