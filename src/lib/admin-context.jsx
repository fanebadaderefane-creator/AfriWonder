import React, { createContext, useContext, useState } from "react";

// Types
export const EntityType = {
  EVENT: "event",
  TRANSPORT_DRIVER: "transport_driver",
  FOOD_RESTAURANT: "food_restaurant",
  SERVICE_PROVIDER: "service_provider",
  HEALTH_DOCTOR: "health_doctor",
  REALESTATE_PROPERTY: "realestate_property",
  INSURANCE_PROVIDER: "insurance_provider",
  COURSE: "course",
  CROWDFUNDING_CAMPAIGN: "crowdfunding_campaign",
  CIVIC_PETITION: "civic_petition",
  CIVIC_REPORT: "civic_report",
  AD: "ad",
};

export const SUBSCRIPTION_PLANS = [
  {
    id: "free",
    name: "Gratuit",
    nameFr: "Gratuit",
    price: 0,
    duration: 30,
    features: [
      "1 événement/mois",
      "Visibilité limitée",
      "Support par email",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    nameFr: "Basique",
    price: 5000,
    duration: 30,
    popular: true,
    features: [
      "10 événements/mois",
      "Visibilité standard",
      "Support prioritaire",
      "Statistiques basiques",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    nameFr: "Premium",
    price: 15000,
    duration: 30,
    features: [
      "Événements illimités",
      "Haute visibilité",
      "Support VIP",
      "Statistiques avancées",
      "Badge vérifié",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    nameFr: "Entreprise",
    price: 50000,
    duration: 30,
    features: [
      "Tout inclus",
      "Visibilité Prioritaire",
      "Support dédié",
      "API access",
      "Gestion d'équipe",
      "Badge VIP",
    ],
  },
];

const AdminContext = createContext(undefined);

export function AdminProvider({ children }) {
  const [pendingEntities, setPendingEntities] = useState([]);
  const [approvedEntities, setApprovedEntities] = useState([]);
  const [bannedEntities, setBannedEntities] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const addPendingEntity = (entity) => {
    const newEntity = {
      ...entity,
      id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      submittedAt: new Date(),
      flags: [],
    };
    setPendingEntities(prev => [...prev, newEntity]);
  };

  const approveEntity = (id) => {
    const entity = pendingEntities.find(e => e.id === id);
    if (entity) {
      const approved = { ...entity, status: "approved", reviewedAt: new Date() };
      setPendingEntities(prev => prev.filter(e => e.id !== id));
      setApprovedEntities(prev => [...prev, approved]);
    }
  };

  const rejectEntity = (id, reason) => {
    const entity = pendingEntities.find(e => e.id === id);
    if (entity) {
      setPendingEntities(prev => prev.filter(e => e.id !== id));
    }
  };

  const hideEntity = (id) => {
    setApprovedEntities(prev => 
      prev.map(e => e.id === id ? { ...e, status: "hidden" } : e)
    );
  };

  const banEntity = (id, reason) => {
    const entity = approvedEntities.find(e => e.id === id);
    if (entity) {
      const banned = { ...entity, status: "banned", flags: [...(entity.flags || []), reason] };
      setApprovedEntities(prev => prev.filter(e => e.id !== id));
      setBannedEntities(prev => [...prev, banned]);
    }
  };

  const unbanEntity = (id) => {
    const entity = bannedEntities.find(e => e.id === id);
    if (entity) {
      const unbanned = { ...entity, status: "approved" };
      setBannedEntities(prev => prev.filter(e => e.id !== id));
      setApprovedEntities(prev => [...prev, unbanned]);
    }
  };

  const addSubscription = (sub) => {
    setSubscriptions(prev => [...prev, sub]);
  };

  const getEntitiesByType = (type) => {
    return [
      ...pendingEntities.filter(e => e.type === type),
      ...approvedEntities.filter(e => e.type === type),
    ];
  };

  const isEntityApproved = (id) => {
    return approvedEntities.some(e => e.id === id);
  };

  const getStats = () => {
    const totalPending = pendingEntities.length;
    const totalApproved = approvedEntities.length;
    const totalBanned = bannedEntities.length;
    const totalSubscriptions = subscriptions.filter(s => s.paid).length;
    const revenue = subscriptions
      .filter(s => s.paid)
      .reduce((acc, s) => {
        const plan = SUBSCRIPTION_PLANS.find(p => p.id === s.plan);
        return acc + (plan?.price || 0);
      }, 0);

    return { totalPending, totalApproved, totalBanned, totalSubscriptions, revenue };
  };

  return (
    <AdminContext.Provider
      value={{
        pendingEntities,
        addPendingEntity,
        approveEntity,
        rejectEntity,
        hideEntity,
        banEntity,
        unbanEntity,
        approvedEntities,
        bannedEntities,
        subscriptions,
        addSubscription,
        getStats,
        getEntitiesByType,
        isEntityApproved,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
}
