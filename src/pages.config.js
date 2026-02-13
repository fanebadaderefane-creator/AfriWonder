/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import About from './pages/About';
import Achievements from './pages/Achievements';
import AddProduct from './pages/AddProduct';
import AdvertiserDashboard from './pages/AdvertiserDashboard';
import BecomeSeller from './pages/BecomeSeller';
import AddService from './pages/AddService';
import Addresses from './pages/Addresses';
import AdminDashboard from './pages/AdminDashboard';
import Analytics from './pages/Analytics';
import ArticleDetails from './pages/ArticleDetails';
import BadgesProfile from './pages/BadgesProfile';
import CampaignDetails from './pages/CampaignDetails';
import Cart from './pages/Cart';
import Certificates from './pages/Certificates';
import Challenges from './pages/Challenges';
import CandidateProfile from './pages/CandidateProfile';
import CompanyProfile from './pages/CompanyProfile';
import Chat from './pages/Chat';
import Checkout from './pages/Checkout';
import Civic from './pages/Civic';
import CivicCreatorDashboard from './pages/CivicCreatorDashboard';
import Communities from './pages/Communities';
import CommunityDetails from './pages/CommunityDetails';
import CourseDetails from './pages/CourseDetails';
import Courses from './pages/Courses';
import Create from './pages/Create';
import CreateCampaign from './pages/CreateCampaign';
import CreateCommunity from './pages/CreateCommunity';
import CreateCourse from './pages/CreateCourse';
import CreateEvent from './pages/CreateEvent';
import CreatePetition from './pages/CreatePetition';
import CreatorTools from './pages/CreatorTools';
import Crowdfunding from './pages/Crowdfunding';
import DirectCall from './pages/DirectCall';
import DirectMessage from './pages/DirectMessage';
import Discover from './pages/Discover';
import DisputeCenter from './pages/DisputeCenter';
import Downloads from './pages/Downloads';
import EditVideo from './pages/EditVideo';
import EditProduct from './pages/EditProduct';
import EventDetails from './pages/EventDetails';
import EventOrganizerDashboard from './pages/EventOrganizerDashboard';
import Events from './pages/Events';
import Help from './pages/Help';
import Home from './pages/Home';
import Inbox from './pages/Inbox';
import InstructorDashboard from './pages/InstructorDashboard';
import JobDetails from './pages/JobDetails';
import Jobs from './pages/Jobs';
import JobsEmployerDashboard from './pages/JobsEmployerDashboard';
import Language from './pages/Language';
import Leaderboard from './pages/Leaderboard';
import LiveStream from './pages/LiveStream';
import LiveView from './pages/LiveView';
import Lives from './pages/Lives';
import LoanDetails from './pages/LoanDetails';
import Marketplace from './pages/Marketplace';
import MarketplaceMap from './pages/MarketplaceMap';
import Microcredit from './pages/Microcredit';
import MobileMoneyPayment from './pages/MobileMoneyPayment';
import ModerationDashboard from './pages/ModerationDashboard';
import MyEventTickets from './pages/MyEventTickets';
import News from './pages/News';
import NotificationCenter from './pages/NotificationCenter';
import NotificationPreferences from './pages/NotificationPreferences';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import Offline from './pages/Offline';
import OrderTracking from './pages/OrderTracking';
import Orders from './pages/Orders';
import OrderDispute from './pages/OrderDispute';
import OrderReview from './pages/OrderReview';
import PetitionDetails from './pages/PetitionDetails';
import Playlists from './pages/Playlists';
import PostJob from './pages/PostJob';
import Product from './pages/Product';
import Profile from './pages/Profile';
import QRCode from './pages/QRCode';
import Referrals from './pages/Referrals';
import RechargeWallet from './pages/RechargeWallet';
import RequestLoan from './pages/RequestLoan';
import Search from './pages/Search';
import SellerDashboard from './pages/SellerDashboard';
import SellerOrders from './pages/SellerOrders';
import SellerProfile from './pages/SellerProfile';
import SellerSubscription from './pages/SellerSubscription';
import SellerPromotions from './pages/SellerPromotions';
import SellerStorefront from './pages/SellerStorefront';
import SellerWallet from './pages/SellerWallet';
import Services from './pages/Services';
import ServiceDetails from './pages/ServiceDetails';
import ServiceBooking from './pages/ServiceBooking';
import Bookings from './pages/Bookings';
import BookingDetails from './pages/BookingDetails';
import Providers from './pages/Providers';
import ProviderProfile from './pages/ProviderProfile';
import BecomeProvider from './pages/BecomeProvider';
import ProviderDashboard from './pages/ProviderDashboard';
import Settings from './pages/Settings';
import ShareOffline from './pages/ShareOffline';
import StartLive from './pages/StartLive';
import Stories from './pages/Stories';
import Support from './pages/Support';
import UserVerification from './pages/UserVerification';
import VerifyCertificate from './pages/VerifyCertificate';
import VideoView from './pages/VideoView';
import Wallet from './pages/Wallet';
import Wishlist from './pages/Wishlist';
import PrivacyPolicy from './pages/PrivacyPolicy';
import DataProtection from './pages/DataProtection';
import PrivacySettings from './pages/PrivacySettings';
import TermsOfService from './pages/TermsOfService';
import Landing from './pages/Landing';
import Transport from './pages/Transport';
import FoodDelivery from './pages/FoodDelivery';
import Utilities from './pages/Utilities';
import Telemedicine from './pages/Telemedicine';
import RealEstate from './pages/RealEstate';
import Insurance from './pages/Insurance';
import Ticketing from './pages/Ticketing';
import RideHistory from './pages/RideHistory';
import BecomeDriver from './pages/BecomeDriver';
import RestaurantMenu from './pages/RestaurantMenu.jsx';
import TicketDetails from './pages/TicketDetails';
import PropertyDetails from './pages/PropertyDetails';
import GamificationHub from './pages/GamificationHub';
import ProjectPresentation from './pages/ProjectPresentation';
import DeveloperPortal from './pages/DeveloperPortal';
import DeveloperGuide from './pages/DeveloperGuide';
import ComingSoon from './pages/ComingSoon';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "Achievements": Achievements,
    "AddProduct": AddProduct,
    "AdvertiserDashboard": AdvertiserDashboard,
    "BecomeSeller": BecomeSeller,
    "AddService": AddService,
    "Addresses": Addresses,
    "AdminDashboard": AdminDashboard,
    "Analytics": Analytics,
    "ArticleDetails": ArticleDetails,
    "BadgesProfile": BadgesProfile,
    "CampaignDetails": CampaignDetails,
    "Cart": Cart,
    "Certificates": Certificates,
    "Challenges": Challenges,
    "CandidateProfile": CandidateProfile,
    "CompanyProfile": CompanyProfile,
    "Chat": Chat,
    "Checkout": Checkout,
    "Civic": Civic,
    "CivicCreatorDashboard": CivicCreatorDashboard,
    "Communities": Communities,
    "CommunityDetails": CommunityDetails,
    "CourseDetails": CourseDetails,
    "Courses": Courses,
    "Create": Create,
    "CreateCampaign": CreateCampaign,
    "CreateCommunity": CreateCommunity,
    "CreateCourse": CreateCourse,
    "CreateEvent": CreateEvent,
    "CreatePetition": CreatePetition,
    "CreatorTools": CreatorTools,
    "Crowdfunding": Crowdfunding,
    "DirectCall": DirectCall,
    "DirectMessage": DirectMessage,
    "Discover": Discover,
    "DisputeCenter": DisputeCenter,
    "Downloads": Downloads,
    "EditVideo": EditVideo,
    "EditProduct": EditProduct,
    "EventDetails": EventDetails,
    "EventOrganizerDashboard": EventOrganizerDashboard,
    "Events": Events,
    "Help": Help,
    "Home": Home,
    "Inbox": Inbox,
    "InstructorDashboard": InstructorDashboard,
    "JobDetails": JobDetails,
    "Jobs": Jobs,
    "JobsEmployerDashboard": JobsEmployerDashboard,
    "Language": Language,
    "Leaderboard": Leaderboard,
    "LiveStream": LiveStream,
    "LiveView": LiveView,
    "Lives": Lives,
    "LoanDetails": LoanDetails,
    "Marketplace": Marketplace,
    "MarketplaceMap": MarketplaceMap,
    "Microcredit": Microcredit,
    "MobileMoneyPayment": MobileMoneyPayment,
    "ModerationDashboard": ModerationDashboard,
    "MyEventTickets": MyEventTickets,
    "News": News,
    "NotificationCenter": NotificationCenter,
    "NotificationPreferences": NotificationPreferences,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "Offline": Offline,
    "OrderTracking": OrderTracking,
    "Orders": Orders,
    "OrderDispute": OrderDispute,
    "OrderReview": OrderReview,
    "PetitionDetails": PetitionDetails,
    "Playlists": Playlists,
    "PostJob": PostJob,
    "Product": Product,
    "Profile": Profile,
    "QRCode": QRCode,
    "Referrals": Referrals,
    "RechargeWallet": RechargeWallet,
    "RequestLoan": RequestLoan,
    "Search": Search,
    "SellerDashboard": SellerDashboard,
    "SellerOrders": SellerOrders,
    "SellerProfile": SellerProfile,
    "SellerSubscription": SellerSubscription,
    "SellerPromotions": SellerPromotions,
    "SellerStorefront": SellerStorefront,
    "SellerWallet": SellerWallet,
    "Services": Services,
    "ServiceDetails": ServiceDetails,
    "ServiceBooking": ServiceBooking,
    "Bookings": Bookings,
    "BookingDetails": BookingDetails,
    "Providers": Providers,
    "ProviderProfile": ProviderProfile,
    "BecomeProvider": BecomeProvider,
    "ProviderDashboard": ProviderDashboard,
    "Settings": Settings,
    "ShareOffline": ShareOffline,
    "StartLive": StartLive,
    "Stories": Stories,
    "Support": Support,
    "UserVerification": UserVerification,
    "VerifyCertificate": VerifyCertificate,
    "VideoView": VideoView,
    "Wallet": Wallet,
    "Wishlist": Wishlist,
    "PrivacyPolicy": PrivacyPolicy,
    "DataProtection": DataProtection,
    "PrivacySettings": PrivacySettings,
    "TermsOfService": TermsOfService,
    "Landing": Landing,
    "Transport": Transport,
    "FoodDelivery": FoodDelivery,
    "Utilities": Utilities,
    "Telemedicine": Telemedicine,
    "RealEstate": RealEstate,
    "Insurance": Insurance,
    "Ticketing": Ticketing,
    "RideHistory": RideHistory,
    "BecomeDriver": BecomeDriver,
    "RestaurantMenu": RestaurantMenu,
    "TicketDetails": TicketDetails,
    "PropertyDetails": PropertyDetails,
    "GamificationHub": GamificationHub,
    "ProjectPresentation": ProjectPresentation,
    "DeveloperPortal": DeveloperPortal,
    "DeveloperGuide": DeveloperGuide,
    "ComingSoon": ComingSoon,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};