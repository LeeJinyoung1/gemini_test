
import React from 'react';
import './FoldedInvitation.css';

const FoldedInvitation = ({ onUnfold }) => {
  return (
    <div className="folded-container" onClick={onUnfold}>
      <div className="folded-content">
        <h1 style={{ fontFamily: "'Cinzel', serif", letterSpacing: '4px' }}>시계탑에 흐른 피</h1>
        <p style={{ color: '#8a0303', fontWeight: 'bold' }}>초대장을 열어보세요</p>
      </div>
    </div>
  );
};

export default FoldedInvitation;
