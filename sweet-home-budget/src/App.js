
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Home, List, PieChart as PieChartIcon, Settings, PlusCircle, X, ChevronLeft, ChevronRight, Settings2, Trash2, Plus, Edit2, CreditCard, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend, LabelList, LineChart, Line, CartesianGrid
} from 'recharts';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import './App.css';

// --- Utils ---
/**
 * Date 객체를 'YYYY-MM-DD' 형식의 문자열로 변환합니다.
 * @param {Date} date - 변환할 날짜 객체
 * @returns {string} 'YYYY-MM-DD' 형식의 문자열
 */
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 특정 기준일(startDay)을 바탕으로 현재 날짜가 속한 한 달 주기의 시작일과 종료일을 계산합니다.
 * @param {Date} currentDate - 기준 날짜
 * @param {number} startDay - 월 시작일 (예: 1일, 5일 등)
 * @returns {object} { start, end, label } 시작일, 종료일 문자열 및 표시용 라벨
 */
const getPeriodDates = (currentDate, startDay) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();
  let startYear = year, startMonth = month;
  // 현재 날짜가 기준일보다 작으면 이전 달부터 시작된 주기로 판단
  if (day < startDay) {
    startMonth = month - 1;
    if (startMonth < 0) { startMonth = 11; startYear = year - 1; }
  }
  const startDate = new Date(startYear, startMonth, startDay);
  const endDate = new Date(startYear, startMonth + 1, startDay - 1);
  return { start: formatDate(startDate), end: formatDate(endDate), label: `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월` };
};

const COLORS = ['#4f46e5', '#ef4444', '#22c55e', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f43f5e'];

// --- Components ---

/**
 * 통계 화면 컴포넌트: 카테고리별 분석, 추세 그래프, 엑셀 내보내기 기능을 제공합니다.
 * @param {Array} transactions - 전체 내역 데이터
 * @param {number} startDay - 월 시작 기준일
 */
const Stats = ({ transactions, startDay }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [activeType, setActiveType] = useState('expense'); 
  const [trendRange, setTrendRange] = useState(6); 
  const [selectedTrendCategory, setSelectedTrendCategory] = useState(null);
  
  const { start, end, label } = getPeriodDates(viewDate, startDay);
  const filtered = transactions.filter(t => t.date >= start && t.date <= end);

  // 선택된 기간 및 타입에 따른 카테고리별 합계 계산 (메모이제이션)
  const statsData = useMemo(() => {
    const map = {};
    const targetTransactions = activeType === 'investment' 
      ? transactions.filter(t => t.type === 'investment' && t.date <= end) // 투자는 누적액 계산
      : filtered.filter(t => t.type === activeType);

    targetTransactions.forEach(t => {
      const amount = t.isWithdrawal ? -t.amount : t.amount;
      map[t.category] = (map[t.category] || 0) + amount;
    });
    return Object.keys(map).map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, filtered, activeType, end]);

  const totalAmount = statsData.reduce((acc, curr) => acc + curr.value, 0);

  /**
   * 현재 통계 데이터를 다중 시트 엑셀 파일로 생성하여 다운로드합니다.
   */
  const exportToExcel = () => {
    if (filtered.length === 0) return alert('내보낼 데이터가 없습니다.');
    const workbook = XLSX.utils.book_new();
    
    /**
     * 특정 타입별 통계 데이터를 엑셀 시트용 객체 배열로 변환합니다.
     */
    const getStatsData = (type) => {
      const map = {};
      const targetTs = type === 'investment'
        ? transactions.filter(t => t.type === 'investment' && t.date <= end)
        : filtered.filter(t => t.type === type);
      targetTs.forEach(t => {
        const amount = t.isWithdrawal ? -t.amount : t.amount;
        map[t.category] = (map[t.category] || 0) + amount;
      });
      return Object.keys(map).map(name => ({
        '카테고리': name,
        '합계 금액': map[name],
        '비중(%)': ((map[name] / (targetTs.reduce((acc, curr) => acc + (curr.isWithdrawal ? -curr.amount : curr.amount), 0) || 1)) * 100).toFixed(1) + '%'
      })).sort((a, b) => b['합계 금액'] - a['합계 금액']);
    };

    const types = [{ id: 'expense', name: '지출 통계' }, { id: 'income', name: '수입 통계' }, { id: 'investment', name: '투자 통계' }];
    types.forEach(t => {
      const stats = getStatsData(t.id);
      if (stats.length > 0) {
        const ws = XLSX.utils.json_to_sheet(stats);
        XLSX.utils.book_append_sheet(workbook, ws, t.name);
      }
    });

    // 전체 상세 내역 시트 추가
    const detailData = filtered.map(t => ({
      '날짜': t.date,
      '구분': t.type === 'income' ? '수입' : t.type === 'expense' ? '지출' : (t.isWithdrawal ? '투자(출금)' : '투자(납입)'),
      '카테고리': t.category,
      '금액': t.amount,
      '메모': t.memo || '',
      '결제수단': t.paymentMethod || ''
    }));
    const detailWs = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailWs, "상세 내역");

    XLSX.writeFile(workbook, `SweetHomeBudget_통계_${label.replace(' ', '')}.xlsx`);
  };

  // 최근 n개월간의 카테고리별 소비 추세 데이터 계산 (메모이제이션)
  const trendData = useMemo(() => {
    const months = [];
    for (let i = trendRange - 1; i >= 0; i--) {
      const d = new Date(viewDate.getFullYear(), viewDate.getMonth() - i, 1);
      const { start, end, label } = getPeriodDates(d, startDay);
      months.push({ start, end, label });
    }
    let displayCategories = statsData.slice(0, 5).map(s => s.name);
    if (selectedTrendCategory && !displayCategories.includes(selectedTrendCategory)) {
      displayCategories = [selectedTrendCategory, ...displayCategories.slice(0, 4)];
    }
    return months.map(m => {
      const lp = m.label.split(' ');
      const yr = lp[0].substring(2, 4);
      const mt = lp[1];
      const name = trendRange > 6 ? `${yr}.${mt}` : mt;
      const data = { name };
      const targetTs = activeType === 'investment'
        ? transactions.filter(t => t.type === 'investment' && t.date <= m.end)
        : transactions.filter(t => t.date >= m.start && t.date <= m.end && t.type === activeType);
      displayCategories.forEach(cat => {
        data[cat] = targetTs.filter(t => t.category === cat).reduce((acc, curr) => acc + (curr.isWithdrawal ? -curr.amount : curr.amount), 0);
      });
      return data;
    });
  }, [transactions, viewDate, startDay, activeType, statsData, trendRange, selectedTrendCategory]);

  // 타입이나 조회 기간 변경 시 선택된 추세 카테고리 초기화
  useEffect(() => { setSelectedTrendCategory(null); }, [activeType, trendRange, viewDate]);

  const totalInc = filtered.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExp = filtered.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const cumulativeInv = transactions.filter(t => t.type === 'investment' && t.date <= end).reduce((acc, curr) => acc + (curr.isWithdrawal ? -curr.amount : curr.amount), 0);
  const balance = totalInc - totalExp;

  return (
    <div className="main-content stats-view">
      <div className="calendar-header">
        <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="icon-btn"><ChevronLeft /></button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0 }}>{label} 통계</h2>
          <div style={{ fontSize: '10px', color: '#64748b' }}>{start} ~ {end}</div>
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="icon-btn"><ChevronRight /></button>
          <button onClick={exportToExcel} className="icon-btn" style={{ color: '#16a34a' }} title="엑셀 다운로드"><FileSpreadsheet size={24} /></button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '15px 5px', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div style={{ borderRight: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '10px', color: '#64748b' }}>수입</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>{totalInc.toLocaleString()}</div>
        </div>
        <div style={{ borderRight: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '10px', color: '#64748b' }}>지출</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626' }}>{totalExp.toLocaleString()}</div>
        </div>
        <div style={{ borderRight: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '10px', color: '#64748b' }}>투자(누적)</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#d97706' }}>{cumulativeInv.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>잔액</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: balance >= 0 ? '#4f46e5' : '#dc2626' }}>{balance.toLocaleString()}</div>
        </div>
      </div>

      <div className="type-selector" style={{ marginTop: '20px' }}>
        <button className={activeType === 'expense' ? 'active expense' : ''} onClick={() => setActiveType('expense')}>지출</button>
        <button className={activeType === 'income' ? 'active income' : ''} onClick={() => setActiveType('income')}>수입</button>
        <button className={activeType === 'investment' ? 'active investment' : ''} onClick={() => setActiveType('investment')}>투자</button>
      </div>

      {statsData.length > 0 ? (
        <div style={{ marginTop: '20px' }}>
          <div className="card chart-card">
            <h4 style={{ margin: '0 0 15px 0', fontSize: '15px' }}>{activeType === 'expense' ? '카테고리별 지출 순위' : activeType === 'income' ? '카테고리별 수입 순위' : '카테고리별 누적 투자 순위'}</h4>
            <div style={{ width: '100%', height: Math.max(200, statsData.length * 45) }}>
              <ResponsiveContainer>
                <BarChart data={statsData} layout="vertical" margin={{ left: 10, right: 60, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={70} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [v.toLocaleString(), ""]} separator="" cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {statsData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    <LabelList dataKey="value" position="right" formatter={(v) => v.toLocaleString()} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#475569' }} offset={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="category-amount-list" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '16px', margin: 0, color: '#1e293b' }}>항목별 상세 내역</h3>
              <span style={{ fontSize: '10px', color: '#64748b' }}>* 항목 클릭 시 하단 추세 확인</span>
            </div>
            {statsData.map((item, index) => (
              <div key={index} className="card transaction-item compact" onClick={() => setSelectedTrendCategory(prev => prev === item.name ? null : item.name)} style={{ borderLeft: `4px solid ${COLORS[index % COLORS.length]}`, padding: '15px', marginBottom: '10px', cursor: 'pointer', backgroundColor: selectedTrendCategory === item.name ? '#f1f5f9' : '#ffffff', border: selectedTrendCategory === item.name ? '1.5px solid #4f46e5' : '1px solid #e2e8f0', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{item.name}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '17px' }}>{item.value.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{totalAmount !== 0 ? ((Math.abs(item.value) / Math.abs(totalAmount)) * 100).toFixed(1) : 0}%</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="card" style={{ backgroundColor: '#f8fafc', textAlign: 'right', padding: '15px', marginTop: '20px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '14px', color: '#64748b', marginRight: '10px' }}>총 합계</span>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: activeType === 'expense' ? '#ef4444' : activeType === 'income' ? '#22c55e' : '#f59e0b' }}>{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="card chart-card" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '15px' }}>카테고리별 소비 추세</h4>
                {selectedTrendCategory && (<button onClick={() => setSelectedTrendCategory(null)} style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', color: '#4f46e5', fontWeight: 'bold', cursor: 'pointer' }}>전체보기</button>)}
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {[6, 12].map(range => (<button key={range} onClick={() => setTrendRange(range)} className={`small-btn ${trendRange === range ? 'active' : ''}`} style={{ backgroundColor: trendRange === range ? '#4f46e5' : '#f1f5f9', color: trendRange === range ? 'white' : '#64748b', padding: '4px 10px', fontSize: '10px' }}>{range}개월</button>))}
              </div>
            </div>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={trendRange === 12 ? 1 : 0} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => v.toLocaleString()} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" onClick={(e) => setSelectedTrendCategory(prev => prev === e.dataKey ? null : e.dataKey)} wrapperStyle={{ cursor: 'pointer', fontSize: '12px', marginTop: '10px' }} />
                  {statsData.slice(0, 5).map((s, index) => {
                    if (selectedTrendCategory !== null && s.name !== selectedTrendCategory) return null;
                    const originalIndex = statsData.findIndex(item => item.name === s.name);
                    return (<Line key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[originalIndex % COLORS.length]} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />);
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8', marginTop: '20px' }}>해당 기간의 {activeType === 'expense' ? '지출' : activeType === 'income' ? '수입' : '투자'} 내역이 없습니다.</div>
      )}
    </div>
  );
};

/**
 * App 메인 컴포넌트: 전역 상태 관리, 인증 흐름, 실시간 데이터 동기화 및 라우팅을 담당합니다.
 */
function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [startDay, setStartDay] = useState(1);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'expense', date: null, isWithdrawal: false, editData: null });

  // Firebase 인증 상태 변경 감지 및 사용자 프로필 동기화
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userRef = doc(db, "users", u.uid);
        onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            // 특정 이메일 계정은 관리자 권한 자동 부여
            if (u.email === 'adsl5964@gmail.com' && (!data.isAdmin || !data.approved)) { await updateDoc(userRef, { isAdmin: true, approved: true }); }
            setUserProfile(data);
          } else {
            // 신규 사용자 가입 처리
            const isSpecialAdmin = u.email === 'adsl5964@gmail.com';
            const newUser = { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL, approved: isSpecialAdmin, isAdmin: isSpecialAdmin, createdAt: serverTimestamp() };
            await setDoc(userRef, newUser);
            setUserProfile(newUser);
          }
          setLoading(false);
        });
      } else { setUser(null); setUserProfile(null); setLoading(false); }
    });
    return () => unsubscribe();
  }, []);

  // 관리자 전용: 전체 사용자 목록 실시간 동기화
  useEffect(() => {
    if (userProfile?.isAdmin) {
      const unsubscribe = onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snap) => {
        setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [userProfile]);

  // 공통 설정 및 카테고리/결제수단 데이터 동기화
  useEffect(() => {
    if (!user || !userProfile?.approved) return;
    onSnapshot(doc(db, "settings", "global"), (snap) => { if (snap.exists()) setStartDay(snap.data().startDay || 1); });
    onSnapshot(query(collection(db, "categories"), orderBy("createdAt", "asc")), (snap) => { setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    onSnapshot(query(collection(db, "paymentMethods"), orderBy("createdAt", "asc")), (snap) => { setPaymentMethods(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
  }, [user, userProfile]);

  // 거래 내역 데이터 실시간 동기화
  useEffect(() => {
    if (!user) { setTransactions([]); return; }
    const unsubscribe = onSnapshot(query(collection(db, "transactions"), orderBy("date", "desc"), orderBy("createdAt", "desc")), (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  /**
   * 원본 거래 내역을 바탕으로 할부 및 반복 결제 데이터를 가상 내역으로 확장합니다 (메모이제이션).
   */
  const expandedTransactions = useMemo(() => {
    const result = [];
    transactions.forEach(t => {
      // 날짜 파싱 (YYYY-MM-DD 안전하게 분리)
      const [y, m, d] = t.date.split('-').map(Number);
      const installments = parseInt(t.installments || 1);

      if (t.type === 'expense' && installments > 1) {
        // 할부 내역 확장
        const monthlyAmount = Math.floor(t.amount / installments);
        for (let i = 0; i < installments; i++) {
          const virtualDate = new Date(y, m - 1 + i, d);
          // 해당 월에 일자가 없는 경우 (예: 31일이 없는 달) 마지막 날로 조정
          if (virtualDate.getMonth() !== (m - 1 + i) % 12) virtualDate.setDate(0);
          
          result.push({ 
            ...t, 
            id: `${t.id}-v${i}`, 
            originalId: t.id, 
            amount: i === installments - 1 ? t.amount - (monthlyAmount * (installments - 1)) : monthlyAmount, 
            date: formatDate(virtualDate), 
            memo: `${t.memo || t.category} (${i + 1}/${installments}회차)`, 
            isInstallment: true 
          });
        }
      } else if (t.type === 'expense' && (t.isRecurring === true || t.isRecurring === 'true')) {
        // 반복 결제 확장: 향후 36개월간의 가상 내역 생성
        for (let i = 0; i < 36; i++) {
          const virtualDate = new Date(y, m - 1 + i, d);
          if (virtualDate.getMonth() !== (m - 1 + i) % 12) virtualDate.setDate(0);
          
          result.push({ 
            ...t, 
            id: `${t.id}-r${i}`, 
            originalId: t.id, 
            date: formatDate(virtualDate), 
            memo: `${t.memo || t.category} (반복)`, 
            isRecurringInstance: true 
          });
        }
      } else { 
        result.push({ ...t, installments: 1 }); 
      }
    });
    return result;
  }, [transactions]);

  /**
   * 내역 추가 모달을 엽니다.
   */
  const openAddModal = (type, date, isWithdrawal = false) => setModalConfig({ isOpen: true, type, date, isWithdrawal, editData: null });
  
  /**
   * 내역 수정 모달을 엽니다 (가상 내역의 경우 원본 데이터를 찾아 연결).
   */
  const openEditModal = (t) => {
    const target = t.originalId ? transactions.find(orig => orig.id === t.originalId) : t;
    setModalConfig({ isOpen: true, type: target.type, date: target.date, isWithdrawal: target.isWithdrawal || false, editData: target });
  };

  if (loading) return (<div className="initial-loading"><img src="logo192.png" alt="Logo" className="loading-logo" /><div className="loading-text">Sweet Home Budget</div></div>);

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/*" element={
          user ? (
            (userProfile?.approved || user.email === 'adsl5964@gmail.com') ? (
              <>
                <Routes>
                  <Route path="/" element={<CalendarDashboard transactions={expandedTransactions} startDay={startDay} onAddClick={openAddModal} onEdit={openEditModal} />} />
                  <Route path="/history" element={<History transactions={expandedTransactions} onEdit={openEditModal} />} />
                  <Route path="/stats" element={<Stats transactions={expandedTransactions} startDay={startDay} />} />
                  <Route path="/settings" element={<SettingsView user={user} userProfile={userProfile} startDay={startDay} setStartDay={setStartDay} transactions={transactions} />} />
                  <Route path="/user-management" element={<UserManagement users={allUsers} onUpdate={async (id, data) => await updateDoc(doc(db, "users", id), data)} />} />
                  <Route path="/categories" element={<ListManager title="카테고리 관리" items={categories} onAdd={async (n, t) => await addDoc(collection(db, "categories"), { name: n, type: t, createdAt: serverTimestamp() })} onUpdate={async (id, n) => await updateDoc(doc(db, "categories", id), { name: n })} onDelete={async (id) => { if (window.confirm('삭제?')) await deleteDoc(doc(db, "categories", id)); }} backPath="/settings" />} />
                  <Route path="/payment-methods" element={<ListManager title="결제 수단 관리" items={paymentMethods} onAdd={async (n) => await addDoc(collection(db, "paymentMethods"), { name: n, createdAt: serverTimestamp() })} onUpdate={async (id, n) => await updateDoc(doc(db, "paymentMethods", id), { name: n })} onDelete={async (id) => { if (window.confirm('삭제?')) await deleteDoc(doc(db, "paymentMethods", id)); }} backPath="/settings" />} />
                </Routes>
                <nav className="nav-bar">
                  <Link to="/" className="nav-item"><Home size={24} />홈</Link>
                  <Link to="/history" className="nav-item"><List size={24} />내역</Link>
                  <Link to="/stats" className="nav-item"><PieChartIcon size={24} />통계</Link>
                  <Link to="/settings" className="nav-item"><Settings size={24} />설정</Link>
                </nav>
                <TransactionModal isOpen={modalConfig.isOpen} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} user={user} initialType={modalConfig.type} initialDate={modalConfig.date} isWithdrawal={modalConfig.isWithdrawal} editData={modalConfig.editData} categories={categories} paymentMethods={paymentMethods} />
              </>
            ) : <PendingApproval user={user} />
          ) : <Navigate to="/login" />
        } />
      </Routes>
    </div>
  );
}

/**
 * 승인 대기 화면 컴포넌트: 관리자 승인이 없는 신규 사용자를 위한 안내 페이지입니다.
 */
const PendingApproval = ({ user }) => (
  <div className="main-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', textAlign: 'center' }}>
    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
      <PlusCircle size={60} color="#f59e0b" style={{ marginBottom: '20px' }} />
      <h2 style={{ margin: '0 0 10px 0' }}>승인 대기 중</h2>
      <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>안녕하세요, <strong>{user.displayName}</strong>님!<br />가계부 이용을 위해서는 관리자의 승인이 필요합니다.<br />관리자에게 승인을 요청해 주세요.</p>
      <button onClick={() => signOut(auth)} className="btn" style={{ marginTop: '20px', backgroundColor: '#64748b', width: '100%' }}>로그아웃</button>
    </div>
  </div>
);

/**
 * 사용자 관리 컴포넌트 (Admin 전용): 가입된 사용자 목록을 조회하고 사용 승인/취소를 처리합니다.
 */
const UserManagement = ({ users, onUpdate }) => {
  return (
    <div className="main-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}><Link to="/settings" className="icon-btn"><ChevronLeft /></Link><h2 style={{ margin: 0 }}>사용자 승인 관리</h2></div>
      {users.map(u => (
        <div key={u.uid} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><img src={u.photoURL} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%' }} /><div><div style={{ fontWeight: 'bold', fontSize: '14px' }}>{u.displayName} {u.isAdmin && <span style={{ color: '#4f46e5', fontSize: '10px' }}>(관리자)</span>}</div><div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div></div></div>
          <div style={{ display: 'flex', gap: '5px' }}>{!u.isAdmin && (<button onClick={() => onUpdate(u.uid, { approved: !u.approved })} className="btn" style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: u.approved ? '#ef4444' : '#22c55e' }}>{u.approved ? '승인취소' : '승인하기'}</button>)}</div>
        </div>
      ))}
    </div>
  );
};

/**
 * 달력 대시보드 컴포넌트: 메인 화면으로 달력 형태의 요약과 일별 상세 내역을 제공합니다.
 */
const CalendarDashboard = ({ transactions, startDay, onAddClick, onEdit }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const { start, end, label } = getPeriodDates(viewDate, startDay);
  
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  
  /**
   * 현재 표시된 주기의 달력 그리드에 필요한 날짜 배열을 생성합니다 (이전/다음 달 패딩 포함).
   */
  const getDaysArray = () => {
    const arr = [];
    const firstDate = new Date(start);
    const lastDate = new Date(end);
    // 달력 첫 주의 일요일 찾기
    const curr = new Date(firstDate); curr.setDate(curr.getDate() - curr.getDay());
    // 달력 마지막 주의 토요일 찾기
    const lastPadded = new Date(lastDate); lastPadded.setDate(lastPadded.getDate() + (6 - lastPadded.getDay()));
    while (curr <= lastPadded) { arr.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }
    return arr;
  };

  const periodDays = getDaysArray();
  const monthTrans = transactions.filter(t => t.date >= start && t.date <= end);
  const totalInc = monthTrans.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExp = monthTrans.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const cumulativeInv = transactions.filter(t => t.type === 'investment' && t.date <= end).reduce((acc, curr) => acc + (curr.isWithdrawal ? -curr.amount : curr.amount), 0);
  
  return (
    <div className="main-content calendar-view">
      <div className="calendar-header">
        <button onClick={prevMonth} className="icon-btn"><ChevronLeft /></button>
        <div style={{ textAlign: 'center' }}><h2 style={{ margin: 0 }}>{label}</h2><div style={{ fontSize: '10px', color: '#64748b' }}>{start} ~ {end}</div></div>
        <button onClick={nextMonth} className="icon-btn"><ChevronRight /></button>
      </div>
      <div className="month-summary-card card">
        <div className="summary-item"><span>수입</span><span className="income-text">₩{totalInc.toLocaleString()}</span></div>
        <div className="summary-item"><span>지출</span><span className="expense-text">₩{totalExp.toLocaleString()}</span></div>
        <div className="summary-item total"><span>잔액</span><span className={totalInc - totalExp >= 0 ? "income-text" : "expense-text"}>₩{(totalInc - totalExp).toLocaleString()}</span></div>
        <div className="summary-item total"><span>투자(누적)</span><span className="investment-text">₩{cumulativeInv.toLocaleString()}</span></div>
      </div>
      <div className="calendar-grid">
        <div className="weekday">일</div><div className="weekday">월</div><div className="weekday">화</div><div className="weekday">수</div><div className="weekday">목</div><div className="weekday">금</div><div className="weekday">토</div>
        {periodDays.map((dateObj, idx) => {
          const dateStr = formatDate(dateObj);
          const isOutOfPeriod = dateStr < start || dateStr > end;
          const isSelected = selectedDate === dateStr;
          const dayTrans = transactions.filter(t => t.date === dateStr);
          const dayInc = dayTrans.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
          const dayExp = dayTrans.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
          const dayInv = dayTrans.filter(t => t.type === 'investment').reduce((acc, curr) => acc + (curr.isWithdrawal ? -curr.amount : curr.amount), 0);
          return (
            <div key={idx} className={`calendar-day ${isSelected ? 'selected' : ''} ${isOutOfPeriod ? 'out-of-period' : ''}`} onClick={() => isOutOfPeriod ? (new Date(dateStr) < new Date(start) ? prevMonth() : nextMonth()) : setSelectedDate(dateStr)}>
              <span className="day-number">{dateObj.getDate()}</span>
              {!isOutOfPeriod && (
                <div className="day-summary">
                  {dayInc > 0 && <div className="income-small">+{dayInc.toLocaleString()}</div>}
                  {dayExp > 0 && <div className="expense-small">-{dayExp.toLocaleString()}</div>}
                  {dayInv !== 0 && (
                    <div className={dayInv > 0 ? "investment-small" : "investment-withdrawal-small"}>
                      {dayInv > 0 ? '*' : '-'}{Math.abs(dayInv).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="daily-detail-section" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ fontSize: '16px', margin: 0 }}>{selectedDate} 내역</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="small-btn expense" onClick={() => onAddClick('expense', selectedDate)}>지출 +</button>
            <button className="small-btn income" onClick={() => onAddClick('income', selectedDate)}>수입 +</button>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="small-btn investment" onClick={() => onAddClick('investment', selectedDate, false)}>투자 +</button>
              <button className="small-btn investment" style={{ backgroundColor: '#fef3c7', color: '#d97706' }} onClick={() => onAddClick('investment', selectedDate, true)}>투자 -</button>
            </div>
          </div>
        </div>
        <div className="daily-list-container">
          {monthTrans.filter(t => t.date === selectedDate).map(t => (
            <div key={t.id} className="card transaction-item compact" onClick={() => onEdit(t)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{t.memo || t.category}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{t.category}{t.type === 'expense' && t.paymentMethod ? ` · ${t.paymentMethod}` : ''}{t.type === 'investment' && (t.isWithdrawal ? ' (출금)' : ' (납입)')}</div>
                  <div className="author-info"><img src={t.userPhoto || 'https://via.placeholder.com/20'} alt={t.userName} className="author-avatar" /><span className="author-name">{t.userName}</span></div>
                </div>
                <div style={{ fontWeight: 'bold', color: t.type === 'expense' ? '#ef4444' : t.type === 'income' ? '#22c55e' : '#f59e0b' }}>{t.isWithdrawal ? '-' : ''}₩{t.amount.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * 연간 요약 컴포넌트: 선택한 연도의 월별 수입/지출/투자 현황을 리스트 형태로 표시합니다.
 */
const History = ({ transactions }) => {
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  
  // 연간 데이터를 월별로 합산 (메모이제이션)
  const monthlyStats = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ name: `${i + 1}월`, income: 0, expense: 0, investment: 0, balance: 0 }));
    transactions.forEach(t => {
      const tYear = t.date.substring(0, 4);
      const tMonth = parseInt(t.date.substring(5, 7), 10);
      if (tYear === String(viewYear)) {
        if (t.type === 'income') months[tMonth - 1].income += t.amount;
        else if (t.type === 'expense') months[tMonth - 1].expense += t.amount;
        else if (t.type === 'investment') months[tMonth - 1].investment += (t.isWithdrawal ? -t.amount : t.amount);
      }
    });
    return months.map(m => ({ ...m, balance: m.income - m.expense }));
  }, [transactions, viewYear]);

  const yearlyTotalInc = monthlyStats.reduce((acc, curr) => acc + curr.income, 0);
  const yearlyTotalExp = monthlyStats.reduce((acc, curr) => acc + curr.expense, 0);
  const yearlyTotalInv = monthlyStats.reduce((acc, curr) => acc + curr.investment, 0);
  const yearlyBalance = yearlyTotalInc - yearlyTotalExp;

  return (
    <div className="main-content">
      <div className="calendar-header" style={{ marginBottom: '20px' }}><button onClick={() => setViewYear(viewYear - 1)} className="icon-btn"><ChevronLeft /></button><div style={{ textAlign: 'center' }}><h2 style={{ margin: 0 }}>{viewYear}년 내역 요약</h2><div style={{ fontSize: '12px', color: '#64748b' }}>연간 월별 현황</div></div><button onClick={() => setViewYear(viewYear + 1)} className="icon-btn"><ChevronRight /></button></div>
      <div className="card" style={{ marginBottom: '25px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '15px 5px', textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ borderRight: '1px solid #e2e8f0' }}><div style={{ fontSize: '10px', color: '#64748b' , marginBottom: '4px' }}>연 수입</div><div style={{ fontSize: '11px', fontWeight: 'bold', color: '#16a34a' }}>{yearlyTotalInc.toLocaleString()}</div></div>
        <div style={{ borderRight: '1px solid #e2e8f0' }}><div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>연 지출</div><div style={{ fontSize: '11px', fontWeight: 'bold', color: '#dc2626' }}>{yearlyTotalExp.toLocaleString()}</div></div>
        <div style={{ borderRight: '1px solid #e2e8f0' }}><div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>연 투자(누적)</div><div style={{ fontSize: '11px', fontWeight: 'bold', color: '#d97706' }}>{yearlyTotalInv.toLocaleString()}</div></div>
        <div><div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>연 잔액</div><div style={{ fontSize: '11px', fontWeight: 'bold', color: yearlyBalance >= 0 ? '#4f46e5' : '#dc2626' }}>{yearlyBalance.toLocaleString()}</div></div>
      </div>
      <div className="monthly-list">
        {monthlyStats.slice().reverse().map((item, index) => (
          (item.income > 0 || item.expense > 0 || Math.abs(item.investment) > 0) && (
            <div key={index} className="card" style={{ padding: '15px', marginBottom: '12px', borderLeft: `5px solid ${item.balance >= 0 ? '#4f46e5' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}><div style={{ fontWeight: 'bold', fontSize: '17px' }}>{item.name}</div><div style={{ textAlign: 'right', fontSize: '16px', fontWeight: 'bold', color: item.balance >= 0 ? '#4f46e5' : '#ef4444' }}>{item.balance >= 0 ? '+' : ''}{item.balance.toLocaleString()}</div></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}><div>수입: <span style={{ color: '#16a34a', fontWeight: '500' }}>{item.income.toLocaleString()}</span></div><div>지출: <span style={{ color: '#dc2626', fontWeight: '500' }}>{item.expense.toLocaleString()}</span></div><div>투자: <span style={{ color: '#d97706', fontWeight: '500' }}>{item.investment.toLocaleString()}</span></div></div>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

/**
 * 내역 추가/수정 모달 컴포넌트: 모든 타입의 거래 내역을 입력하거나 수정, 삭제할 수 있는 폼을 제공합니다.
 */
const TransactionModal = ({ isOpen, onClose, user, initialType, initialDate, isWithdrawal: initialIsWithdrawal, categories, paymentMethods, editData }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState('');
  const [memo, setMemo] = useState('');
  const [installments, setInstallments] = useState(1);
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);

  // 모달이 열릴 때 초기 데이터 설정
  useEffect(() => {
    if (isOpen) {
      if (editData) { setAmount(editData.amount.toString()); setType(editData.type); setIsWithdrawal(editData.isWithdrawal || false); setCategory(editData.category); setPaymentMethod(editData.paymentMethod || ''); setDate(editData.date); setMemo(editData.memo || ''); setInstallments(editData.installments || 1); setIsRecurring(editData.isRecurring || false); }
      else { setAmount(''); setType(initialType || 'expense'); setIsWithdrawal(initialIsWithdrawal || false); setDate(initialDate || formatDate(new Date())); setMemo(''); setInstallments(1); setIsRecurring(false); }
    }
  }, [isOpen, editData, initialDate, initialType, initialIsWithdrawal]);

  // 타입 선택 시 카테고리 및 결제수단 기본값 설정
  useEffect(() => {
    if (isOpen && !editData) {
      const targetType = type === 'investment' ? (isWithdrawal ? 'investment_withdrawal' : 'investment_deposit') : type;
      const filtered = categories.filter(c => c.type === targetType || (type === 'investment' && c.type === 'investment'));
      if (filtered.length > 0) setCategory(filtered[0].name);
      if (type === 'expense' && paymentMethods.length > 0) setPaymentMethod(paymentMethods[0].name);
    }
  }, [type, isWithdrawal, categories, paymentMethods, isOpen, editData]);

  if (!isOpen) return null;

  /**
   * 폼 데이터를 검증하고 Firebase Firestore에 저장(추가 또는 수정)합니다.
   */
  const handleSubmit = async (e) => {
    e.preventDefault(); if (!amount) return alert('금액 입력!'); setLoading(true);
    try {
      const d = { uid: user.uid, userName: user.displayName, userPhoto: user.photoURL, type, isWithdrawal: type === 'investment' ? isWithdrawal : false, amount: parseInt(amount), category, paymentMethod: type === 'expense' ? paymentMethod : '', date, memo, installments: type === 'expense' ? parseInt(installments) : 1, isRecurring: type === 'expense' ? isRecurring : false, updatedAt: serverTimestamp() };
      if (editData) await updateDoc(doc(db, "transactions", editData.id), d);
      else await addDoc(collection(db, "transactions"), { ...d, createdAt: serverTimestamp() });
      onClose();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  /**
   * 현재 내역을 삭제합니다.
   */
  const handleDelete = async () => {
    const msg = editData.isRecurring ? '정말 삭제하시겠습니까? (연결된 모든 반복 내역이 삭제됩니다)' : (editData.installments > 1 ? '정말 삭제하시겠습니까? (할부 내역 전체가 삭제됩니다)' : '정말 삭제하시겠습니까?');
    if (!editData || !window.confirm(msg)) return;
    setLoading(true);
    try { await deleteDoc(doc(db, "transactions", editData.id)); onClose(); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{editData ? '내역 수정' : '내역 추가'}</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>

        {!editData && (
          <div className="type-selector">
            <button className={type === 'expense' ? 'active expense' : ''} onClick={() => setType('expense')}>지출</button>
            <button className={type === 'income' ? 'active income' : ''} onClick={() => setType('income')}>수입</button>
            <button className={type === 'investment' ? 'active investment' : ''} onClick={() => setType('investment')}>투자</button>
          </div>
        )}

        {type === 'investment' && !editData && (
          <div className="type-selector" style={{ marginTop: '-12px', marginBottom: '24px', backgroundColor: '#fff7ed' }}>
            <button 
              className={!isWithdrawal ? 'active investment' : ''} 
              onClick={() => setIsWithdrawal(false)}
              style={{ color: !isWithdrawal ? '#d97706' : '#94a3b8' }}
            >
              납입 (+)
            </button>
            <button 
              className={isWithdrawal ? 'active' : ''} 
              style={{ backgroundColor: isWithdrawal ? 'white' : 'transparent', color: isWithdrawal ? '#9a3412' : '#94a3b8' }} 
              onClick={() => setIsWithdrawal(true)}
            >
              출금 (-)
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>금액 {type === 'expense' && installments > 1 && `(월 ${Math.floor(amount/installments).toLocaleString()}원)`}</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: '#64748b' }}>₩</span>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                style={{ paddingLeft: '36px', fontSize: '20px', fontWeight: '800' }}
                placeholder="0"
                autoFocus 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1.2 }}>
              <label>날짜</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            
            {type === 'expense' && (
              <div className="form-group" style={{ flex: 1 }}>
                <label>결제 방법</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {paymentMethods.map(pm => <option key={pm.id} value={pm.name}>{pm.name}</option>)}
                </select>
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label>카테고리</label>
            <div className="category-chips-container">
              {categories.filter(c => {
                if (type === 'investment') {
                  return isWithdrawal ? c.type === 'investment_withdrawal' : (c.type === 'investment_deposit' || c.type === 'investment');
                }
                return c.type === type;
              }).map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-chip ${category === cat.name ? `selected ${type}` : ''}`}
                  onClick={() => setCategory(cat.name)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
            {type === 'expense' && (
              <div className="form-group">
              <label>결제 옵션</label>
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'center', 
                backgroundColor: '#f8fafc', 
                padding: '12px', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0' 
              }}>
                <div style={{ flex: 1 }}>
                  <select 
                    value={installments} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setInstallments(val);
                      if (val > 1) setIsRecurring(false);
                    }}
                    disabled={isRecurring}
                    style={{ padding: '8px', fontSize: '14px' }}
                  >
                    <option value={1}>일시불</option>
                    {[...Array(23)].map((_, i) => (<option key={i+2} value={i+2}>{i+2}개월</option>))}
                  </select>
                </div>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '8px 12px', 
                    backgroundColor: isRecurring ? 'white' : 'transparent',
                    borderRadius: '12px',
                    cursor: installments > 1 ? 'not-allowed' : 'pointer',
                    border: isRecurring ? '1px solid #4f46e5' : '1px solid transparent',
                    boxShadow: isRecurring ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    if (installments === 1) setIsRecurring(!isRecurring);
                  }}
                >
                  <input 
                    type="checkbox" 
                    id="recurring" 
                    checked={isRecurring} 
                    onChange={(e) => {
                      e.stopPropagation();
                      setIsRecurring(e.target.checked);
                      if (e.target.checked) setInstallments(1);
                    }} 
                    disabled={installments > 1}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                  />
                  <label 
                    htmlFor="recurring" 
                    style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: installments > 1 ? '#cbd5e1' : '#1e293b', cursor: 'pointer' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    반복
                  </label>
                </div>
              </div>
            </div> // form-group 닫기 추가
          )}
        </div>

          <div className="form-group">
            <label>메모</label>
            <input 
              type="text" 
              value={memo} 
              onChange={(e) => setMemo(e.target.value)} 
              placeholder="내용 입력 (선택)"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexShrink: 0 }}>
            {editData && (
              <button 
                type="button" 
                onClick={handleDelete} 
                disabled={loading} 
                className="btn" 
                style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#64748b', padding: '12px' }}
              >
                <Trash2 size={18} />
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className="btn" 
              style={{ 
                flex: 4, 
                backgroundColor: type === 'expense' ? '#ef4444' : type === 'income' ? '#22c55e' : '#f59e0b',
                padding: '12px'
              }}
            >
              {loading ? '처리 중...' : (editData ? '수정 완료' : '저장하기')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * 설정 화면 컴포넌트: 사용자 프로필 확인, 한 달 시작일 변경, 카테고리/결제수단 관리 및 데이터 초기화 기능을 제공합니다.
 */
const SettingsView = ({ user, userProfile, startDay, setStartDay, transactions }) => {
  /**
   * (관리자 전용) 모든 거래 내역 데이터를 삭제합니다.
   */
  const handleDeleteAll = async () => {
    if (!window.confirm('정말 모든 내역(수입, 지출, 투자)을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    alert('삭제를 시작합니다. 잠시만 기다려 주세요...');
    try { const dp = transactions.map(t => deleteDoc(doc(db, "transactions", t.id))); await Promise.all(dp); alert('모든 내역이 성공적으로 삭제되었습니다.'); } catch (e) { console.error(e); alert('삭제 중 오류가 발생했습니다.'); }
  };

  return (
    <div className="main-content">
      <h2>설정</h2>
      <div className="card profile-card"><img src={user.photoURL} alt="" /><div><div className="u-name">{user.displayName} {userProfile?.isAdmin && <span style={{ color: '#4f46e5', fontSize: '12px' }}>(관리자)</span>}</div><div className="u-email">{user.email}</div></div></div>
      <div className="card"><label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>한 달 시작일 설정</label><select value={startDay} onChange={async (e) => { const d = parseInt(e.target.value); setStartDay(d); await setDoc(doc(db, "settings", "global"), { startDay: d }, { merge: true }); }} style={{ width: '100%', padding: '10px', borderRadius: '8px' }}>{[...Array(28)].map((_, i) => <option key={i+1} value={i+1}>{i+1}일</option>)}</select></div>
      <Link to="/categories" className="card menu-item"><Settings2 size={24} color="#4f46e5" /><div>카테고리 관리</div></Link>
      <Link to="/payment-methods" className="card menu-item"><CreditCard size={24} color="#4f46e5" /><div>결제 수단 관리</div></Link>
      {userProfile?.isAdmin && (<Link to="/user-management" className="card menu-item" style={{ border: '1px solid #e0e7ff', backgroundColor: '#f5f7ff' }}><Settings2 size={24} color="#4f46e5" /><div>사용자 승인 관리</div></Link>)}
      {userProfile?.isAdmin && (<div className="card" style={{ marginTop: '20px', border: '1px solid #fee2e2' }}><h4 style={{ color: '#ef4444', marginTop: 0 }}>데이터 관리 (위험)</h4><p style={{ fontSize: '12px', color: '#64748b' }}>모든 수입, 지출, 투자 내역을 삭제합니다.</p><button onClick={handleDeleteAll} className="btn" style={{ backgroundColor: '#ef4444', width: '100%', marginTop: '10px' }}>모든 내역 삭제하기</button></div>)}
      <button onClick={() => signOut(auth)} className="btn logout-btn">로그아웃</button>
    </div>
  );
};

/**
 * 리스트 관리 컴포넌트: 카테고리나 결제 수단 같은 단순 목록 데이터를 추가, 수정, 삭제하는 공통 UI입니다.
 */
const ListManager = ({ title, items, onAdd, onUpdate, onDelete, backPath }) => {
  const isCategoryMode = title.includes('카테고리');
  const [newName, setNewName] = useState('');
  const [activeTab, setActiveTab] = useState('expense');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const filteredItems = isCategoryMode ? items.filter(item => (activeTab === 'investment_deposit' ? (item.type === 'investment_deposit' || item.type === 'investment') : item.type === activeTab)) : items;
  
  const handleAdd = (e) => { e.preventDefault(); if (!newName.trim()) return; onAdd(newName, isCategoryMode ? activeTab : null); setNewName(''); };
  
  const handleUpdate = async (id) => { if (!editingName.trim()) return setEditingId(null); await onUpdate(id, editingName); setEditingId(null); };
  
  const getTabLabel = (tab) => { if (tab === 'expense') return '지출'; if (tab === 'income') return '수입'; if (tab === 'investment_deposit') return '투자(입금)'; if (tab === 'investment_withdrawal') return '투자(출금)'; return ''; };

  return (
    <div className="main-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}><Link to={backPath} className="icon-btn"><ChevronLeft /></Link><h2 style={{ margin: 0 }}>{title}</h2></div>
      {isCategoryMode && (
        <div className="type-selector" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
          <button className={activeTab === 'expense' ? 'active expense' : ''} style={{ fontSize: '10px', padding: '10px 0' }} onClick={() => setActiveTab('expense')}>지출</button>
          <button className={activeTab === 'income' ? 'active income' : ''} style={{ fontSize: '10px', padding: '10px 0' }} onClick={() => setActiveTab('income')}>수입</button>
          <button className={activeTab === 'investment_deposit' ? 'active investment' : ''} style={{ fontSize: '10px', padding: '10px 0' }} onClick={() => setActiveTab('investment_deposit')}>투자(입금)</button>
          <button className={activeTab === 'investment_withdrawal' ? 'active' : ''} style={{ fontSize: '10px', padding: '10px 0', backgroundColor: activeTab === 'investment_withdrawal' ? '#f59e0b' : '' }} onClick={() => setActiveTab('investment_withdrawal')}>투자(출금)</button>
        </div>
      )}
      <div className="card"><form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px' }}><input type="text" placeholder={isCategoryMode ? `${getTabLabel(activeTab)} 카테고리 추가` : "추가"} value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} /><button type="submit" className="btn" style={{ padding: '10px' }}><Plus /></button></form></div>
      <div className="category-list">
        {filteredItems.length > 0 ? (filteredItems.map(i => (
          <div key={i.id} className="card transaction-item compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', marginBottom: '10px' }}>
            {editingId === i.id ? (<div style={{ display: 'flex', gap: '10px', flex: 1, marginRight: '10px' }}><input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus style={{ flex: 1, padding: '5px 10px', borderRadius: '6px', border: '1px solid #4f46e5' }} /><button onClick={() => handleUpdate(i.id)} className="icon-btn" style={{ color: '#22c55e' }}><X size={20} style={{ transform: 'rotate(45deg)' }} /></button><button onClick={() => setEditingId(null)} className="icon-btn" style={{ color: '#94a3b8' }}><X size={20} /></button></div>) : (
              <><span style={{ fontWeight: '500' }}>{i.name}</span><div style={{ display: 'flex', gap: '5px' }}><button onClick={() => { setEditingId(i.id); setEditingName(i.name); }} className="delete-btn" style={{ color: '#64748b' }}><Edit2 size={16} /></button><button onClick={() => onDelete(i.id)} className="delete-btn"><Trash2 size={16} /></button></div></>
            )}
          </div>
        ))) : (<div className="card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>{isCategoryMode ? `${getTabLabel(activeTab)} 카테고리가 없습니다.` : "데이터가 없습니다."}</div>)}
      </div>
    </div>
  );
};

/**
 * 로그인 화면 컴포넌트: 구글 계정을 이용한 OAuth 로그인을 제공합니다.
 */
const Login = () => {
  const handleGoogleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  return (<div className="main-content login-view"><h1>Sweet Home</h1><p>우리 집 가계부</p><button onClick={handleGoogleLogin} className="btn login-btn" style={{ marginTop: '20px' }}>구글로 시작하기</button></div>);
};

export default App;
