const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backendRoutesDir = path.join(root, 'backend', 'src', 'routes');
const frontendPagesDir = path.join(root, 'src', 'pages');
const pagesConfigPath = path.join(root, 'src', 'pages.config.js');

const CDC_BACKEND = {
  1: ['auth.routes', 'users.routes', 'verification.routes'],
  2: ['videos.routes', 'comments.routes', 'saves.routes', 'feed.routes'],
  3: ['users.routes', 'subscriptions.routes'],
  4: ['feed.routes'],
  5: ['videos.routes', 'comments.routes', 'upload.routes', 'playlists.routes'],
  6: ['stories.routes'],
  7: ['messages.routes', 'calls.routes'],
  8: ['videos.routes', 'playlists.routes', 'creatorSubscription.routes'],
  9: ['live.routes'],
  10: ['gifts.routes', 'creatorSupport.routes', 'creatorSubscription.routes', 'ads.routes', 'creatorDashboard.routes'],
  11: ['products.routes', 'orders.routes', 'seller.routes', 'seller-reviews.routes', 'sellerProfile.routes', 'wishlist.routes'],
  12: ['payments.routes'],
  13: ['shipping.routes', 'shipments.routes', 'foodOrders.routes', 'restaurants.routes'],
  14: ['rides.routes', 'drivers.routes'],
  15: ['providers.routes', 'bookings.routes', 'jobs.routes', 'services.routes'],
  16: ['courses.routes', 'certificates.routes'],
  17: ['music.routes', 'playlists.routes'],
  18: ['gamification.routes', 'leaderboard.routes'],
  19: ['doctors.routes', 'appointments.routes', 'pharmacies.routes'],
  20: ['travel.routes'],
  21: ['mapPlaces.routes'],
  22: ['communities.routes'],
  23: ['events.routes', 'tickets.routes'],
  24: ['upload.routes', 'saves.routes', 'cloud.routes'],
  25: ['feed.routes', 'products.routes', 'users.routes', 'search.routes'],
  26: ['notifications.routes'],
  27: ['ads.routes'],
  28: ['analytics.routes', 'creatorDashboard.routes'],
  29: ['auth.routes', 'moderation.routes'],
  30: ['admin.routes', 'moderation.routes', 'businessIntelligence.routes', 'aiEngine.routes'],
  31: ['ai.routes'],
  32: [],
  33: [],
};

const CDC_FRONTEND = {
  1: ['Landing', 'Profile', 'Settings', 'UserVerification'],
  2: ['Home', 'Create', 'VideoView', 'Discover', 'Favorites', 'EditVideo'],
  3: ['Profile', 'Discover'],
  4: ['Home', 'Discover'],
  5: ['Create', 'Home', 'VideoView', 'EditVideo', 'Playlists'],
  6: ['Stories'],
  7: ['Chat', 'Inbox', 'DirectMessage', 'DirectCall', 'GroupChat'],
  8: ['VideoView', 'Playlists', 'CreatorTools'],
  9: ['Live', 'Lives', 'LiveView', 'StartLive'],
  10: ['CreatorTools', 'Analytics', 'AdvertiserDashboard', 'RechargeWallet'],
  11: ['Marketplace', 'Cart', 'Checkout', 'Product', 'SellerDashboard', 'SellerStorefront', 'SellerProfile', 'AddProduct', 'EditProduct', 'Wishlist'],
  12: ['Wallet', 'QRCode', 'MobileMoneyPayment', 'RechargeWallet'],
  13: ['FoodDelivery', 'RestaurantMenu', 'OrderTracking'],
  14: ['Transport', 'DriverDashboard', 'BecomeDriver', 'RideHistory'],
  15: ['Providers', 'ProviderProfile', 'BecomeProvider', 'Bookings', 'ServiceBooking', 'ServiceDetails', 'Jobs', 'JobDetails', 'PostJob', 'CandidateProfile'],
  16: ['Courses', 'CourseDetails', 'CreateCourse', 'InstructorDashboard', 'Certificates', 'VerifyCertificate', 'Formations', 'BecomeTrainer'],
  17: ['Playlists'],
  18: ['GamificationHub', 'Leaderboard', 'Achievements', 'BadgesProfile'],
  19: ['Health', 'Telemedicine'],
  20: ['Voyage'],
  21: ['MarketplaceMap'],
  22: ['Communities', 'CommunityDetails', 'CreateCommunity'],
  23: ['Events', 'CreateEvent', 'EventDetails', 'EventOrganizerDashboard', 'Ticketing', 'MyEventTickets', 'TicketDetails'],
  24: ['Cloud', 'Favorites', 'Downloads', 'ShareOffline'],
  25: ['Search'],
  26: ['Notifications', 'NotificationCenter', 'NotificationSettings', 'NotificationPreferences'],
  27: ['AdvertiserDashboard', 'AdvertiserRegistration', 'CreateAdCampaign', 'CampaignDetails'],
  28: ['Analytics', 'CreatorTools'],
  29: ['Settings', 'ModerationDashboard', 'Support'],
  30: ['AdminPage', 'AdminDashboard', 'ModerationDashboard'],
  31: ['Assistant'],
  32: ['Language'],
  33: [],
};

function routeFileExists(name) {
  const base = name.replace('.routes', '');
  const candidates = [
    path.join(backendRoutesDir, `${base}.routes.ts`),
    path.join(backendRoutesDir, `${base}.routes.js`),
  ];
  return candidates.some((p) => fs.existsSync(p));
}

function pageExists(name) {
  const candidates = [
    path.join(frontendPagesDir, `${name}.jsx`),
    path.join(frontendPagesDir, `${name}.js`),
  ];
  return candidates.some((p) => fs.existsSync(p));
}

function getPagesFromConfig() {
  const content = fs.readFileSync(pagesConfigPath, 'utf8');
  const match = content.match(/"([A-Za-z0-9]+)":\s*\w+/g);
  return match ? new Set(match.map((m) => m.split(':')[0].replace(/"/g, ''))) : new Set();
}

const registeredPages = getPagesFromConfig();

let backendOk = 0;
let backendMissing = 0;
let frontendOk = 0;
let frontendMissing = 0;
const missingBackend = [];
const missingFrontend = [];

for (let i = 1; i <= 33; i++) {
  const routes = CDC_BACKEND[i] || [];
  for (const r of routes) {
    if (routeFileExists(r)) backendOk++;
    else {
      backendMissing++;
      missingBackend.push(`CDC ${i}: ${r}`);
    }
  }
  const pages = CDC_FRONTEND[i] || [];
  for (const p of pages) {
    if (registeredPages.has(p) && pageExists(p)) frontendOk++;
    else if (pages.length) {
      frontendMissing++;
      if (!registeredPages.has(p)) missingFrontend.push(`CDC ${i}: ${p} (not in config)`);
      else if (!pageExists(p)) missingFrontend.push(`CDC ${i}: ${p} (file missing)`);
    }
  }
}

console.log('=== Vérification CDC AfriWonder ===\n');
console.log('Backend routes:', backendOk, 'OK', backendMissing ? `, ${backendMissing} manquants` : '');
if (missingBackend.length) console.log(missingBackend.slice(0, 15).join('\n'));
console.log('\nFrontend pages (config + fichier):', frontendOk, 'OK', frontendMissing ? `, ${frontendMissing} manquants` : '');
if (missingFrontend.length) console.log(missingFrontend.slice(0, 15).join('\n'));

const totalBackend = Object.values(CDC_BACKEND).reduce((s, arr) => s + arr.length, 0);
const totalFrontend = Object.values(CDC_FRONTEND).reduce((s, arr) => s + arr.length, 0);
console.log('\nRésumé:', Math.round((backendOk / totalBackend) * 100) + '% backend', Math.round((frontendOk / totalFrontend) * 100) + '% frontend');
process.exit(backendMissing + frontendMissing > 0 ? 1 : 0);
