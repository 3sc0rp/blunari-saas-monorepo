import React from "react";
import MarketplaceLandingPage from "./MarketplaceLandingPage";

/**
 * Index Page - Consumer Marketplace Landing
 * 
 * This is the public-facing homepage for Blunari's restaurant discovery platform.
 * 
 * Behavior:
 * - Shows marketplace landing page by default
 * - If user is logged in as tenant owner/employee, redirects to /dashboard
 * - If user is consumer, shows marketplace with search and featured restaurants
 * 
 * Target: Atlanta, GA market
 */
const Index = () => {
  return <MarketplaceLandingPage />;
};

export default Index;
