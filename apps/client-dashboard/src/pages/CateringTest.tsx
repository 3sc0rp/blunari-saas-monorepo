import React from "react";
import CateringWidget from "@/components/catering/CateringWidget";

const CateringTestPage: React.FC = () => {
  // Use real tenant slug from URL or props
  const testSlug = "demo";

  return (
    <div className="min-h-screen">
      <CateringWidget slug={testSlug} />
    </div>
  );
};

export default CateringTestPage;
