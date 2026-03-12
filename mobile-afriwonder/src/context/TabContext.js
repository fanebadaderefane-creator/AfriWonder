import React from 'react';

export const TabContext = React.createContext({
  activeTab: 'home',
  setActiveTab: () => {},
});

export function TabProvider({ children, activeTab, setActiveTab }) {
  return (
    <TabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabContext.Provider>
  );
}
