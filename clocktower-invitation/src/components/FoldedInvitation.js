
import React from 'react';
import './FoldedInvitation.css';
import sealImg from '../img/seal.png';

const FoldedInvitation = ({ onUnfold }) => {
  return (
    <div className="folded-container" onClick={onUnfold}>
      <div className="folded-content">
        <div className="envelope-flap-wrapper">
          <div className="envelope-flap"></div>
        </div>
        <div className="letter-paper"></div> {/* Added letter paper element */}
        <div className="envelope-front"></div> {/* Added envelope front panel to hide bottom of paper */}
        <h1 className="invitation-title" style={{ 
          fontFamily: "'Nanum Myeongjo', serif", 
          letterSpacing: '2px', 
          color: '#5a0202', /* Slightly darker red for better contrast */
          fontSize: '1.5rem', /* Reduced font size */
          marginTop: '15px',
          marginBottom: '5px',
          fontWeight: '700',
          textShadow: '0 1px 2px rgba(255,255,255,0.8)'
        }}>시계탑에 흐른 피</h1>
        
        {/* 중앙에 위치한 실링 왁스 이미지 - 봉투 덮개 끝부분(중앙 아래쪽)에 위치하도록 조정 */}
        <div className="seal-container" style={{ margin: '8px 0 15px 0', zIndex: 5, display: 'flex', justifyContent: 'center' }}>
          <div style={{ 
            width: '80px', /* Reduced size */
            height: '80px', /* Reduced size */
            borderRadius: '50%', 
            overflow: 'hidden',
            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))', /* Softer shadow */
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

        <p className="invitation-text" style={{ color: '#5a0202', fontWeight: 'bold', fontSize: '0.9rem', letterSpacing: '1px', fontStyle: 'italic', marginTop: '8px' }}>
          초대장을 클릭하여 열어보세요
        </p>
      </div>
    </div>
  );
};

export default FoldedInvitation;
