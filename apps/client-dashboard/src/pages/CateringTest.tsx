import React from "react";
import CateringWidget from "@/components/catering/CateringWidget";

const CateringTestPage: React.FC = () => {
  // Test with a sample slug - you can change this to test different tenants
  const testSlug = "demo-restaurant";

  return (
    <div className="min-h-screen">
      <CateringWidget slug={testSlug} />
    </div>
  );
};

export default CateringTestPage;
