// Navigation test component to force deployment update
import React from 'react';

const NavigationTest = () => {
  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'red', 
      color: 'white', 
      padding: '5px',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      v{Date.now()}
    </div>
  );
};

export default NavigationTest;