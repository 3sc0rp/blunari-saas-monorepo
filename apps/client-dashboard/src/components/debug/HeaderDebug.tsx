import React from "react";

const HeaderDebug: React.FC = () => {
  return (
    <div 
      className="bg-red-500 text-white p-4 w-full"
      style={{ 
        width: '100vw', 
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw'
      }}
    >
      <div className="text-center">
        🔧 DEBUG: This header should span the full viewport width
      </div>
    </div>
  );
};

export default HeaderDebug;
