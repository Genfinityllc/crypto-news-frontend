import React from 'react';
import styled from 'styled-components';

const TestContainer = styled.div`
  padding: 20px;
  background: #333;
  color: white;
  margin: 20px 0;
  border: 2px solid #0066cc;
`;

const TestImage = styled.img`
  width: 300px;
  height: 200px;
  border: 2px solid #ff0000;
  display: block;
  margin: 10px 0;
`;

const ImageTest = () => {
  const testImageUrl = "https://images.weserv.nl/?url=https%3A%2F%2Fcryptopotato.com%2Fwp-content%2Fuploads%2F2025%2F05%2FETH_CB-6.jpg&w=400&h=225&fit=cover&output=jpg&q=85";
  
  return (
    <TestContainer>
      <h3>🔍 IMAGE LOADING DEBUG TEST</h3>
      <p>Testing image URL: {testImageUrl}</p>
      
      <TestImage 
        src={testImageUrl}
        alt="Test image"
        onLoad={() => console.log('✅ DEBUG: Test image loaded successfully')}
        onError={(e) => {
          console.log('❌ DEBUG: Test image failed to load');
          console.log('Error details:', e);
        }}
      />
      
      <p>If you see a red border but no image, there's a loading issue.</p>
      <p>Check browser console for error messages.</p>
    </TestContainer>
  );
};

export default ImageTest;