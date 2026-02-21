
import React from 'react';
import './FoldedInvitation.css';
import sealImg from '../img/seal.png';

const FoldedInvitation = ({ onUnfold }) => {
  return (
    <div className="folded-container" onClick={onUnfold}>
      <div className="folded-content">
        <div style={{ position: 'absolute', top: '15px', right: '15px', opacity: 0.15 }}>
          <span style={{ fontSize: '40px', color: '#5a0202', filter: 'blur(0.5px)' }}>📜</span>
        </div>
        <h1 style={{ 
          fontFamily: "'Nanum Myeongjo', serif", 
          letterSpacing: '2px', 
          color: '#8a0303', 
          fontSize: '2.8rem', 
          marginBottom: '20px',
          fontWeight: '700'
        }}>시계탑에 흐른 피</h1>
        
        {/* 중앙에 위치한 실링 왁스 이미지 */}
        <div style={{ margin: '20px 0', zIndex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ 
            width: '130px', 
            height: '130px', 
            borderRadius: '50%', 
            overflow: 'hidden',
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent'
          }}>
            <img 
              src={sealImg} 
              alt="Wax Seal" 
              style={{ 
                width: '100%', 
                height: '100%',
                objectFit: 'cover',
                clipPath: 'circle(40%)' /* 요청하신 대로 40%로 조정 */
              }} 
            />
          </div>
        </div>

        <p style={{ color: '#5a0202', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '1px', fontStyle: 'italic', marginTop: '10px' }}>
          초대장을 클릭하여 열어보세요
        </p>
      </div>
    </div>
  );
};

export default FoldedInvitation;
