import React, { createContext, useContext } from 'react';

interface StorefrontContextType {
  basePath: string;
  cartCount: number;
  shopName?: string;
  supportLink?: string;
}

const StorefrontContext = createContext<StorefrontContextType>({ basePath: '', cartCount: 0 });

export const StorefrontProvider: React.FC<{
  basePath: string;
  cartCount: number;
  shopName?: string;
  supportLink?: string;
  children: React.ReactNode;
}> = ({ basePath, cartCount, shopName, supportLink, children }) => {
  // Normalize support link: ensure it's an absolute URL
  const normalizedSupportLink = supportLink
    ? supportLink.startsWith('http://') || supportLink.startsWith('https://')
      ? supportLink
      : `https://${supportLink}`
    : undefined;

  return (
    <StorefrontContext.Provider value={{ basePath, cartCount, shopName, supportLink: normalizedSupportLink }}>
      {children}
    </StorefrontContext.Provider>
  );
};

export const useStorefront = () => useContext(StorefrontContext);

/** Build a full path within the current storefront */
export const useStorefrontPath = () => {
  const { basePath } = useStorefront();
  return (path: string) => {
    if (!path || path === '/') return basePath || '/';
    return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
  };
};
