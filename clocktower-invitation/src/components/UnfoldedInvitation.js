
import React from 'react';
import './UnfoldedInvitation.css';

const UnfoldedInvitation = () => {
  return (
    <div className="unfolded-container">
      <div className="unfolded-content">
        {/* 상단 붉은 실링 왁스 이미지 - 신뢰도 높은 경로로 교체 */}
        <div style={{ textAlign: 'center', marginBottom: '-40px', zIndex: 1, position: 'relative' }}>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Seal_of_a_Notary_Public.svg/512px-Seal_of_a_Notary_Public.svg.png" 
            alt="" 
            style={{ 
              width: '100px', 
              height: '100px',
              backgroundColor: '#8a0303', 
              borderRadius: '50%',
              padding: '5px',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5)) contrast(1.2)',
              border: '2px solid #5a0202'
            }} 
          />
        </div>

        <h2 style={{ fontFamily: "'Pirata One', system-ui", color: '#8a0303', borderBottom: '1px solid #d4af37', paddingBottom: '10px', marginBottom: '25px', paddingTop: '30px', fontSize: '3rem', letterSpacing: '2px' }}>
          INVITATION
        </h2>
        
        <div style={{ textAlign: 'left', lineHeight: '1.8', fontSize: '1.05rem', color: '#2c2c2c' }}>
          <p style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '20px' }}>친애하는 주민 여러분 귀하,</p>
          
          <p>평화롭던 우리 마을, <strong>레이븐스우드 블러프</strong>에 다시금 어두운 그림자가 드리웠습니다.</p>
          <p>시계탑의 종소리가 울릴 때마다, 무고한 이들의 비명소리가 밤공기를 가릅니다. <br/>우리 중에 숨어든 사악한 존재, <span style={{ color: '#8a0303', fontWeight: 'bold' }}>'악마'</span>가 깨어났음이 분명합니다.</p>
          
          <div style={{ margin: '25px 0', borderLeft: '3px solid #8a0303', paddingLeft: '15px', fontStyle: 'italic' }}>
            <p>낮에는 이웃의 탈을 쓰고 함께 웃고 떠들지만,<br/>밤이 되면 날카로운 발톱을 드러내는 자가 누구입니까?</p>
            <p>당신의 옆에 앉은 제빵사는 진실을 말하고 있습니까?<br/>광장 건너편의 사서는 정말로 아무것도 보지 못했을까요?</p>
          </div>

          <p>당신을 이 비극과 심판의 현장으로 초대합니다.<br/>진실을 밝혀 마을을 구하시겠습니까, 아니면 거짓으로 혼란을 가중시키시겠습니까?</p>
          
          <div style={{ marginTop: '30px', padding: '20px', border: '1px double #d4af37', backgroundColor: 'rgba(212, 175, 55, 0.05)', textAlign: 'center' }}>
            <p style={{ fontWeight: 'bold', color: '#5a0202', fontSize: '1.1rem' }}>&lt;시계탑에 흐른 피 : 첫 번째 밤의 회합&gt;</p>
            <p style={{ margin: '5px 0' }}><strong>일시:</strong> 2026년 3월 1일</p>
            <p style={{ margin: '5px 0' }}><strong>장소:</strong> 을지로 어딘가</p>
            <p style={{ margin: '5px 0' }}><strong>참가비:</strong> 2~3만원 (파티룸 + 다과비)</p>
            <p style={{ margin: '5px 0' }}><strong>준비물:</strong> 누구도 믿지 않는 의심 어린 눈초리</p>
          </div>

          <p style={{ marginTop: '30px', textAlign: 'center', fontWeight: 'bold', color: '#8a0303' }}>부디 오셔서 당신의 역할을 다해주십시오.<br/>오늘 밤, 시계탑에는 또다시 피가 흐를 것입니다.</p>
          <p style={{ fontSize: '0.85rem', textAlign: 'center', color: '#666', marginTop: '10px' }}>(늦으시는 분은 첫날 밤 희생자가 될 수 있습니다.)</p>
        </div>

        <div style={{ marginTop: '30px', position: 'relative', overflow: 'hidden', height: '200px', borderRadius: '2px', border: '1px solid #d4af37' }}>
          <img 
            src="https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?q=80&w=1000&auto=format&fit=crop" 
            alt="" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(50%) sepia(50%) brightness(70%)' }} 
          />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}></div>
        </div>
      </div>
    </div>
  );
};

export default UnfoldedInvitation;
