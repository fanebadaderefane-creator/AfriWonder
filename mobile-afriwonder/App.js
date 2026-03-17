import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import MainTabs from './src/navigation/MainTabs';
import CommentsScreen from './src/screens/CommentsScreen';
import ShareScreen from './src/screens/ShareScreen';
import SupportScreen from './src/screens/SupportScreen';
import SearchScreen from './src/screens/SearchScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import VideoViewScreen from './src/screens/VideoViewScreen';
import ProfileUserScreen from './src/screens/ProfileUserScreen';
import StartLiveScreen from './src/screens/StartLiveScreen';
import LiveStreamScreen from './src/screens/LiveStreamScreen';
import LiveViewScreen from './src/screens/LiveViewScreen';
import WalletScreen from './src/screens/WalletScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import InboxScreen from './src/screens/InboxScreen';
import ChatScreen from './src/screens/ChatScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import EditVideoScreen from './src/screens/EditVideoScreen';
import MenuPlusScreen from './src/screens/MenuPlusScreen';
import ModuleScreen from './src/screens/ModuleScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import EventsScreen from './src/screens/EventsScreen';
import TransportScreen from './src/screens/TransportScreen';
import FoodDeliveryScreen from './src/screens/FoodDeliveryScreen';
import UtilitiesScreen from './src/screens/UtilitiesScreen';
import TelemedicineScreen from './src/screens/TelemedicineScreen';
import RealEstateScreen from './src/screens/RealEstateScreen';
import InsuranceScreen from './src/screens/InsuranceScreen';
import NewsScreen from './src/screens/NewsScreen';
import MicrocreditScreen from './src/screens/MicrocreditScreen';
import CrowdfundingScreen from './src/screens/CrowdfundingScreen';
import JobsScreen from './src/screens/JobsScreen';
import ReferralsScreen from './src/screens/ReferralsScreen';
import CreatorToolsScreen from './src/screens/CreatorToolsScreen';
import MiniAppsStoreScreen from './src/screens/MiniAppsStoreScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import GamificationHubScreen from './src/screens/GamificationHubScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import CandidateProfileScreen from './src/screens/CandidateProfileScreen';
import CompanyProfileScreen from './src/screens/CompanyProfileScreen';
import JobDashboardScreen from './src/screens/JobDashboardScreen';
import PostJobScreen from './src/screens/PostJobScreen';
import JobApplyScreen from './src/screens/JobApplyScreen';
import BadgesProfileScreen from './src/screens/BadgesProfileScreen';
import MatchingCenterScreen from './src/screens/MatchingCenterScreen';
import LanguageScreen from './src/screens/LanguageScreen';
import HelpScreen from './src/screens/HelpScreen';
import AboutScreen from './src/screens/AboutScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import DataProtectionScreen from './src/screens/DataProtectionScreen';
import AdvertiserDashboardScreen from './src/screens/AdvertiserDashboardScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ArticleDetailsScreen from './src/screens/ArticleDetailsScreen';
import CampaignDetailsScreen from './src/screens/CampaignDetailsScreen';
import JobDetailsScreen from './src/screens/JobDetailsScreen';
import MiniAppDetailsScreen from './src/screens/MiniAppDetailsScreen';
import CourseDetailsScreen from './src/screens/CourseDetailsScreen';
import RestaurantMenuScreen from './src/screens/RestaurantMenuScreen';
import CreateCampaignScreen from './src/screens/CreateCampaignScreen';
import ContributeCampaignScreen from './src/screens/ContributeCampaignScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import CreateEventScreen from './src/screens/CreateEventScreen';
import ProviderProfileScreen from './src/screens/ProviderProfileScreen';
import BecomeProviderScreen from './src/screens/BecomeProviderScreen';
import DeveloperConsoleScreen from './src/screens/DeveloperConsoleScreen';
import CreateAdCampaignScreen from './src/screens/CreateAdCampaignScreen';
import CourseEnrollScreen from './src/screens/CourseEnrollScreen';
import DriverDashboardScreen from './src/screens/DriverDashboardScreen';
import CreatorMonetizationDashboardScreen from './src/screens/CreatorMonetizationDashboardScreen';
import BulkUploadManagerScreen from './src/screens/BulkUploadManagerScreen';
import RevenueSharingScreen from './src/screens/RevenueSharingScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import SellerDashboardScreen from './src/screens/SellerDashboardScreen';
import SellerOrdersScreen from './src/screens/SellerOrdersScreen';
import SellerWalletScreen from './src/screens/SellerWalletScreen';
import SellerSubscriptionScreen from './src/screens/SellerSubscriptionScreen';
import SellerPromotionsScreen from './src/screens/SellerPromotionsScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';
import OrderDisputeScreen from './src/screens/OrderDisputeScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import GroupBuysScreen from './src/screens/GroupBuysScreen';

const linking = {
  prefixes: ['afriwonder://'],
  config: {
    screens: {
      Auth: 'auth',
      App: {
        screens: {
          // onglets internes si besoin
        },
      },
      VideoView: 'video/:videoId',
    },
  },
};

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="App" component={MainTabs} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="VideoView" component={VideoViewScreen} />
          <Stack.Screen name="ProfileUser" component={ProfileUserScreen} />
          <Stack.Screen
            name="Comments"
            component={CommentsScreen}
            options={{
              presentation: 'transparentModal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="Share"
            component={ShareScreen}
            options={{
              presentation: 'transparentModal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="StartLive" component={StartLiveScreen} />
          <Stack.Screen name="LiveStream" component={LiveStreamScreen} />
          <Stack.Screen name="LiveView" component={LiveViewScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Inbox" component={InboxScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="GroupChat" component={GroupChatScreen} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
          <Stack.Screen name="EditVideo" component={EditVideoScreen} />
          <Stack.Screen
            name="MenuPlus"
            component={MenuPlusScreen}
            options={{
              presentation: 'transparentModal',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen name="Module" component={ModuleScreen} />
          <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
          <Stack.Screen name="Events" component={EventsScreen} />
          <Stack.Screen name="Transport" component={TransportScreen} />
          <Stack.Screen name="FoodDelivery" component={FoodDeliveryScreen} />
          <Stack.Screen name="Utilities" component={UtilitiesScreen} />
          <Stack.Screen name="Telemedicine" component={TelemedicineScreen} />
          <Stack.Screen name="RealEstate" component={RealEstateScreen} />
          <Stack.Screen name="Insurance" component={InsuranceScreen} />
          <Stack.Screen name="News" component={NewsScreen} />
          <Stack.Screen name="Microcredit" component={MicrocreditScreen} />
          <Stack.Screen name="Crowdfunding" component={CrowdfundingScreen} />
          <Stack.Screen name="Jobs" component={JobsScreen} />
          <Stack.Screen name="Referrals" component={ReferralsScreen} />
          <Stack.Screen name="CreatorTools" component={CreatorToolsScreen} />
          <Stack.Screen name="MiniAppsStore" component={MiniAppsStoreScreen} />
          <Stack.Screen name="Courses" component={CoursesScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          <Stack.Screen name="GamificationHub" component={GamificationHubScreen} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} />
          <Stack.Screen name="BadgesProfile" component={BadgesProfileScreen} />
          <Stack.Screen name="MatchingCenter" component={MatchingCenterScreen} />
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="DataProtection" component={DataProtectionScreen} />
          <Stack.Screen name="AdvertiserDashboard" component={AdvertiserDashboardScreen} />
          <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          <Stack.Screen name="ArticleDetails" component={ArticleDetailsScreen} />
          <Stack.Screen name="CampaignDetails" component={CampaignDetailsScreen} />
          <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
          <Stack.Screen name="MiniAppDetails" component={MiniAppDetailsScreen} />
          <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
          <Stack.Screen name="RestaurantMenu" component={RestaurantMenuScreen} />
          <Stack.Screen name="CreateCampaign" component={CreateCampaignScreen} />
          <Stack.Screen name="ContributeCampaign" component={ContributeCampaignScreen} />
          <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
          <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
          <Stack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
          <Stack.Screen name="BecomeProvider" component={BecomeProviderScreen} />
          <Stack.Screen name="DeveloperConsole" component={DeveloperConsoleScreen} />
          <Stack.Screen name="CreateAdCampaign" component={CreateAdCampaignScreen} />
          <Stack.Screen name="CourseEnroll" component={CourseEnrollScreen} />
          <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
          <Stack.Screen name="CreatorMonetizationDashboard" component={CreatorMonetizationDashboardScreen} />
          <Stack.Screen name="BulkUploadManager" component={BulkUploadManagerScreen} />
          <Stack.Screen name="RevenueSharing" component={RevenueSharingScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          <Stack.Screen name="CandidateProfile" component={CandidateProfileScreen} />
          <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} />
          <Stack.Screen name="JobDashboard" component={JobDashboardScreen} />
          <Stack.Screen name="PostJob" component={PostJobScreen} />
          <Stack.Screen name="JobApply" component={JobApplyScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="Orders" component={OrdersScreen} />
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
          <Stack.Screen name="OrderDispute" component={OrderDisputeScreen} />
          <Stack.Screen name="Wishlist" component={WishlistScreen} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="GroupBuys" component={GroupBuysScreen} />
          <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} />
          <Stack.Screen name="SellerOrders" component={SellerOrdersScreen} />
          <Stack.Screen name="SellerWallet" component={SellerWalletScreen} />
          <Stack.Screen name="SellerSubscription" component={SellerSubscriptionScreen} />
          <Stack.Screen name="SellerPromotions" component={SellerPromotionsScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer linking={linking}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
