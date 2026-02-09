import React, { createContext, useState, useEffect, useContext } from "react";

export const TranslationContext = createContext();

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return context;
}

const translations = {
  fr: {
    // Navigation
    home: "Accueil",
    create: "Créer",
    search: "Rechercher",
    inbox: "Messages",
    profile: "Profil",
    live: "En direct",
    marketplace: "Marché",
    explore: "Explorer",
    communities: "Communautés",
    
    // Moderation
    moderation_dashboard: "Tableau de modération",
    reports: "Rapports",
    pending_reports: "Rapports en attente",
    active_bans: "Bannissements actifs",
    resolved_today: "Traités aujourd'hui",
    report_content: "Signaler ce contenu",
    reason: "Raison",
    description: "Description",
    thank_you_report: "Merci pour votre signalement",
    content_removed: "Contenu supprimé",
    user_banned: "Utilisateur banni",
    
    // Notifications
    notifications: "Notifications",
    no_unread: "Aucune notification non lue",
    mark_all_as_read: "Marquer tout comme lu",
    like: "J'aime",
    comment: "Commentaire",
    follow: "Suivi",
    message: "Message",
    order_update: "Mise à jour de commande",
    
    // Settings
    settings: "Paramètres",
    language: "Langue",
    theme: "Thème",
    privacy: "Confidentialité",
    notifications_settings: "Paramètres des notifications",
    account_settings: "Paramètres du compte",
    logout: "Déconnexion",
    
    // Common
    loading: "Chargement...",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    close: "Fermer",
    back: "Retour",
    next: "Suivant",
    previous: "Précédent",
    yes: "Oui",
    no: "Non",
    
    // Errors
    error: "Erreur",
    something_went_wrong: "Quelque chose s'est mal passé",
    try_again: "Réessayer",
    
    // Video
    video: "Vidéo",
    videos: "Vidéos",
    upload: "Télécharger",
    publish: "Publier",
    title: "Titre",
    duration: "Durée",
    views: "Vues",
    likes: "J'aime",
    shares: "Partages",
    
    // Products
    product: "Produit",
    products: "Produits",
    price: "Prix",
    quantity: "Quantité",
    add_to_cart: "Ajouter au panier",
    checkout: "Passer la commande",
    
    // Users
    followers: "Abonnés",
    following: "Abonnement",
    follow: "S'abonner",
    unfollow: "Se désabonner"
  },
  en: {
    // Navigation
    home: "Home",
    create: "Create",
    search: "Search",
    inbox: "Inbox",
    profile: "Profile",
    live: "Live",
    marketplace: "Marketplace",
    explore: "Explore",
    communities: "Communities",
    
    // Moderation
    moderation_dashboard: "Moderation Dashboard",
    reports: "Reports",
    pending_reports: "Pending Reports",
    active_bans: "Active Bans",
    resolved_today: "Resolved Today",
    report_content: "Report Content",
    reason: "Reason",
    description: "Description",
    thank_you_report: "Thank you for your report",
    content_removed: "Content Removed",
    user_banned: "User Banned",
    
    // Notifications
    notifications: "Notifications",
    no_unread: "No unread notifications",
    mark_all_as_read: "Mark all as read",
    like: "Like",
    comment: "Comment",
    follow: "Follow",
    message: "Message",
    order_update: "Order Update",
    
    // Settings
    settings: "Settings",
    language: "Language",
    theme: "Theme",
    privacy: "Privacy",
    notifications_settings: "Notification Settings",
    account_settings: "Account Settings",
    logout: "Logout",
    
    // Common
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    back: "Back",
    next: "Next",
    previous: "Previous",
    yes: "Yes",
    no: "No",
    
    // Errors
    error: "Error",
    something_went_wrong: "Something went wrong",
    try_again: "Try Again",
    
    // Video
    video: "Video",
    videos: "Videos",
    upload: "Upload",
    publish: "Publish",
    title: "Title",
    duration: "Duration",
    views: "Views",
    likes: "Likes",
    shares: "Shares",
    
    // Products
    product: "Product",
    products: "Products",
    price: "Price",
    quantity: "Quantity",
    add_to_cart: "Add to Cart",
    checkout: "Checkout",
    
    // Users
    followers: "Followers",
    following: "Following",
    follow: "Follow",
    unfollow: "Unfollow"
  },
  ar: {
    // Navigation
    home: "الصفحة الرئيسية",
    create: "إنشاء",
    search: "بحث",
    inbox: "الرسائل",
    profile: "الملف الشخصي",
    live: "بث مباشر",
    marketplace: "السوق",
    explore: "استكشاف",
    communities: "المجتمعات",
    
    // Moderation
    moderation_dashboard: "لوحة التحكم بالإشراف",
    reports: "التقارير",
    pending_reports: "التقارير المعلقة",
    active_bans: "الحظر النشط",
    resolved_today: "تم الحل اليوم",
    report_content: "الإبلاغ عن المحتوى",
    reason: "السبب",
    description: "الوصف",
    thank_you_report: "شكرا على إبلاغك",
    content_removed: "تم حذف المحتوى",
    user_banned: "تم حظر المستخدم",
    
    // Notifications
    notifications: "الإخطارات",
    no_unread: "لا توجد إخطارات غير مقروءة",
    mark_all_as_read: "وضع علامة على جميع القراءات",
    like: "إعجاب",
    comment: "تعليق",
    follow: "متابعة",
    message: "رسالة",
    order_update: "تحديث الطلب",
    
    // Settings
    settings: "الإعدادات",
    language: "اللغة",
    theme: "المظهر",
    privacy: "الخصوصية",
    notifications_settings: "إعدادات الإخطارات",
    account_settings: "إعدادات الحساب",
    logout: "تسجيل الخروج",
    
    // Common
    loading: "جاري التحميل...",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    close: "إغلاق",
    back: "رجوع",
    next: "التالي",
    previous: "السابق",
    yes: "نعم",
    no: "لا",
    
    // Errors
    error: "خطأ",
    something_went_wrong: "حدث خطأ ما",
    try_again: "حاول مرة أخرى",
    
    // Video
    video: "فيديو",
    videos: "مقاطع فيديو",
    upload: "تحميل",
    publish: "نشر",
    title: "العنوان",
    duration: "المدة",
    views: "المشاهدات",
    likes: "الإعجابات",
    shares: "المشاركات",
    
    // Products
    product: "منتج",
    products: "منتجات",
    price: "السعر",
    quantity: "الكمية",
    add_to_cart: "أضف إلى السلة",
    checkout: "الدفع",
    
    // Users
    followers: "المتابعون",
    following: "يتابع",
    follow: "متابعة",
    unfollow: "إلغاء المتابعة"
  }
};

export default function TranslationProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "fr";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  const value = {
    language,
    t,
    changeLanguage,
    availableLanguages: Object.keys(translations)
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}