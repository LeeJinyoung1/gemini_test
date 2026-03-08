
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Home, List, PieChart as PieChartIcon, Settings, PlusCircle, LogIn, X, LogOut, ChevronLeft, ChevronRight, Settings2, Trash2, Plus, TrendingUp, TrendingDown, Wallet, Edit2, CreditCard, Calendar, BarChart3, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList, LineChart, Line, CartesianGrid
} from 'recharts';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import './App.css';

// --- Utils ---
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getPeriodDates = (currentDate, startDay) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();
  let startYear = year, startMonth = month;
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

// 1. Stats Component (Monthly Category Analysis)
const Stats = ({ transactions, startDay }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [activeType, setActiveType] = useState('expense'); // 'expense' or 'income'
  const [trendRange, setTrendRange] = useState(6); // 6, 12, 24 months
  const [selectedTrendCategory, setSelectedTrendCategory] = useState(null);
  
  const { start, end, label } = getPeriodDates(viewDate, startDay);
  const filtered = transactions.filter(t => t.date >= start && t.date <= end);

  const statsData = useMemo(() => {
    const map = {};
    filtered.filter(t => t.type === activeType).forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.keys(map).map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, activeType]);

  const totalAmount = statsData.reduce((acc, curr) => acc + curr.value, 0);

  const exportToExcel = () => {
    if (filtered.length === 0) return alert('내보낼 데이터가 없습니다.');
    
    const workbook = XLSX.utils.book_new();

    // 1. 통계 데이터 생성 함수
    const getStatsData = (type) => {
      const map = {};
      filtered.filter(t => t.type === type).forEach(t => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
      return Object.keys(map).map(name => ({
        '카테고리': name,
        '합계 금액': map[name],
        '비중(%)': ((map[name] / (filtered.filter(t => t.type === type).reduce((acc, curr) => acc + curr.amount, 0) || 1)) * 100).toFixed(1) + '%'
      })).sort((a, b) => b['합계 금액'] - a['합계 금액']);
    };

    // 2. 각 타입별 시트 추가
    const types = [{ id: 'expense', name: '지출 통계' }, { id: 'income', name: '수입 통계' }, { id: 'investment', name: '투자 통계' }];
    types.forEach(t => {
      const stats = getStatsData(t.id);
      if (stats.length > 0) {
        const ws = XLSX.utils.json_to_sheet(stats);
        XLSX.utils.book_append_sheet(workbook, ws, t.name);
      }
    });

    // 3. 상세 내역 시트 추가
    const detailData = filtered.map(t => ({
      '날짜': t.date,
      '구분': t.type === 'income' ? '수입' : t.type === 'expense' ? '지출' : '투자',
      '카테고리': t.category,
      '금액': t.amount,
      '메모': t.memo || '',
      '결제수단': t.paymentMethod || ''
    }));
    const detailWs = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailWs, "상세 내역");

    // 4. 파일 저장
    XLSX.writeFile(workbook, `SweetHomeBudget_통계_${label.replace(' ', '')}.xlsx`);
  };

  // 선택된 기간(6, 12, 24개월) 추세 데이터 계산
  const trendData = useMemo(() => {
    const months = [];
    for (let i = trendRange - 1; i >= 0; i--) {
      const d = new Date(viewDate.getFullYear(), viewDate.getMonth() - i, 1);
      const { start, end, label } = getPeriodDates(d, startDay);
      months.push({ start, end, label });
    }

    // 현재 분석 중인 타입에서 상위 5개 카테고리만 추림
    const topCategories = statsData.slice(0, 5).map(s => s.name);
    
    return months.map(m => {
      // 기간이 길어지면 년도도 함께 표시 (예: '24.3월')
      const labelParts = m.label.split(' ');
      const year = labelParts[0].substring(2, 4);
      const month = labelParts[1];
      const name = trendRange > 6 ? `${year}.${month}` : month;

      const data = { name };
      const monthFiltered = transactions.filter(t => t.date >= m.start && t.date <= m.end && t.type === activeType);
      topCategories.forEach(cat => {
        data[cat] = monthFiltered.filter(t => t.category === cat).reduce((acc, curr) => acc + curr.amount, 0);
      });
      return data;
    });
  }, [transactions, viewDate, startDay, activeType, statsData, trendRange]);

  // 타입이나 기간이 바뀌면 선택된 카테고리 초기화
  useEffect(() => {
    setSelectedTrendCategory(null);
  }, [activeType, trendRange, viewDate]);

  // 이번 달 전체 요약 계산
  const totalInc = filtered.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExp = filtered.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const totalInv = filtered.filter(t => t.type === 'investment').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalInc - totalExp - totalInv;

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

      {/* 1. 재정 요약 카드 */}
      <div className="card" style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '15px 5px', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div style={{ borderRight: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>수입</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>{totalInc.toLocaleString()}</div>
        </div>
        <div style={{ borderRight: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>지출</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626' }}>{totalExp.toLocaleString()}</div>
        </div>
        <div style={{ borderRight: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>투자</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#d97706' }}>{totalInv.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>차액</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: balance >= 0 ? '#4f46e5' : '#dc2626' }}>{balance.toLocaleString()}</div>
        </div>
      </div>

      {/* 2. 수입/지출 선택 탭 */}
      <div className="type-selector" style={{ marginTop: '20px' }}>
        <button className={activeType === 'expense' ? 'active expense' : ''} onClick={() => setActiveType('expense')}>지출</button>
        <button className={activeType === 'income' ? 'active income' : ''} onClick={() => setActiveType('income')}>수입</button>
        <button className={activeType === 'investment' ? 'active investment' : ''} onClick={() => setActiveType('investment')}>투자</button>
      </div>

      {statsData.length > 0 ? (
        <div style={{ marginTop: '20px' }}>
          {/* 3. 그래프 영역 */}
          <div className="card chart-card">
            <h4 style={{ margin: '0 0 15px 0', fontSize: '15px' }}>{activeType === 'expense' ? '카테고리별 지출 순위' : activeType === 'income' ? '카테고리별 수입 순위' : '카테고리별 투자 순위'}</h4>
            <div style={{ width: '100%', height: Math.max(200, statsData.length * 45) }}>
              <ResponsiveContainer>
                <BarChart data={statsData} layout="vertical" margin={{ left: 10, right: 60, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={70} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(v) => [v.toLocaleString(), ""]} 
                    separator="" 
                    cursor={{ fill: '#f8fafc' }} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {statsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(v) => v.toLocaleString()} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#475569' }} offset={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. 추세 분석 그래프 (새 기능) */}
          <div className="card chart-card" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '15px' }}>카테고리별 소비 추세</h4>
                {selectedTrendCategory && (
                  <button 
                    onClick={() => setSelectedTrendCategory(null)} 
                    style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', color: '#4f46e5', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    전체보기
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {[6, 12].map(range => (
                  <button key={range} onClick={() => setTrendRange(range)} className={`small-btn ${trendRange === range ? 'active' : ''}`} style={{ backgroundColor: trendRange === range ? '#4f46e5' : '#f1f5f9', color: trendRange === range ? 'white' : '#64748b', padding: '4px 10px', fontSize: '10px' }}>
                    {range}개월
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={trendRange === 12 ? 1 : 0} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => v.toLocaleString()} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend 
                    iconType="circle" 
                    onClick={(e) => setSelectedTrendCategory(prev => prev === e.dataKey ? null : e.dataKey)}
                    wrapperStyle={{ cursor: 'pointer', fontSize: '12px', marginTop: '10px' }}
                  />
                  {statsData.slice(0, 5).map((s, index) => {
                    if (selectedTrendCategory !== null && s.name !== selectedTrendCategory) return null;
                    return (
                      <Line 
                        key={s.name} 
                        type="monotone" 
                        dataKey={s.name} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={3} 
                        dot={{ r: 3 }} 
                        activeDot={{ r: 6 }} 
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: '10px', color: '#64748b', marginTop: '15px', textAlign: 'center' }}>
              {selectedTrendCategory 
                ? `* [${selectedTrendCategory}] 카테고리의 상세 추세입니다. (범례 클릭 시 전체보기)` 
                : `* 범례를 클릭하면 해당 카테고리만 볼 수 있습니다. (상위 5개)`}
            </p>
          </div>

          {/* 5. 상세 리스트 영역 */}
          <div className="category-amount-list" style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#1e293b' }}>항목별 상세 내역</h3>
            {statsData.map((item, index) => (
              <div key={index} className="card transaction-item compact" style={{ borderLeft: `4px solid ${COLORS[index % COLORS.length]}`, padding: '15px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{item.name}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '17px' }}>{item.value.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{totalAmount > 0 ? ((item.value / totalAmount) * 100).toFixed(1) : 0}%</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="card" style={{ backgroundColor: '#f8fafc', textAlign: 'right', padding: '15px', marginTop: '20px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '14px', color: '#64748b', marginRight: '10px' }}>총 합계</span>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: activeType === 'expense' ? '#ef4444' : '#22c55e' }}>{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8', marginTop: '20px' }}>
          해당 기간의 {activeType === 'expense' ? '지출' : activeType === 'income' ? '수입' : '투자'} 내역이 없습니다.
        </div>
      )}
    </div>
  );
};

// 2. 나머지 컴포넌트들은 기존과 동일하게 유지...
// (공간 절약을 위해 수정된 Stats 위주로 작성하며 나머지는 기존 로직을 보존합니다.)

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // 관리자용 전체 사용자 목록
  const [startDay, setStartDay] = useState(1);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'expense', date: null, editData: null });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // Firestore에서 사용자 프로필 확인/생성
        const userRef = doc(db, "users", u.uid);
        onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            // 지정된 이메일은 항상 관리자 및 승인 상태 유지 (자동 업데이트)
            if (u.email === 'adsl5964@gmail.com' && (!data.isAdmin || !data.approved)) {
              await updateDoc(userRef, { isAdmin: true, approved: true });
            }
            setUserProfile(data);
          } else {
            // 첫 로그인 시 프로필 생성
            const isSpecialAdmin = u.email === 'adsl5964@gmail.com';
            const newUser = {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
              approved: isSpecialAdmin, // 지정된 이메일은 즉시 승인
              isAdmin: isSpecialAdmin,   // 지정된 이메일은 즉시 관리자
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, newUser);
            setUserProfile(newUser);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 관리자용: 모든 사용자 목록 가져오기
  useEffect(() => {
    if (userProfile?.isAdmin) {
      const unsubscribe = onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snap) => {
        setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [userProfile]);

  useEffect(() => {
    if (!user || !userProfile?.approved) return;
    onSnapshot(doc(db, "settings", "global"), (snap) => { if (snap.exists()) setStartDay(snap.data().startDay || 1); });
    onSnapshot(query(collection(db, "categories"), orderBy("createdAt", "asc")), (snap) => { setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    onSnapshot(query(collection(db, "paymentMethods"), orderBy("createdAt", "asc")), (snap) => { setPaymentMethods(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
  }, [user, userProfile]);

  useEffect(() => {
    if (!user) { setTransactions([]); return; }
    const unsubscribe = onSnapshot(query(collection(db, "transactions"), orderBy("date", "desc"), orderBy("createdAt", "desc")), (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // 할부 및 반복 내역을 매달 분할/복제된 가상 내역으로 확장
  const expandedTransactions = useMemo(() => {
    const result = [];
    transactions.forEach(t => {
      const installments = parseInt(t.installments || 1);
      
      if (t.type === 'expense' && installments > 1) {
        // 1. 할부 처리
        const monthlyAmount = Math.floor(t.amount / installments);
        const firstDate = new Date(t.date);
        for (let i = 0; i < installments; i++) {
          const virtualDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + i, firstDate.getDate());
          if (virtualDate.getMonth() !== (firstDate.getMonth() + i) % 12) virtualDate.setDate(0);
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
      } else if (t.type === 'expense' && t.isRecurring) {
        // 2. 반복 결제 처리 (향후 36개월간 생성)
        const firstDate = new Date(t.date);
        for (let i = 0; i < 36; i++) {
          const virtualDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + i, firstDate.getDate());
          if (virtualDate.getMonth() !== (firstDate.getMonth() + i) % 12) virtualDate.setDate(0);
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
        // 3. 일반 내역
        result.push({ ...t, installments: 1 });
      }
    });
    return result;
  }, [transactions]);

  const openAddModal = (type, date) => setModalConfig({ isOpen: true, type, date, editData: null });
  const openEditModal = (t) => {
    // 가상 내역(할부)인 경우 원본 데이터를 찾아 모달에 전달
    const target = t.originalId ? transactions.find(orig => orig.id === t.originalId) : t;
    setModalConfig({ isOpen: true, type: target.type, date: target.date, editData: target });
  };

  if (loading) return (
    <div className="initial-loading">
      <img src="logo192.png" alt="Logo" class="loading-logo" />
      <div className="loading-text">Sweet Home Budget</div>
    </div>
  );

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
                <TransactionModal isOpen={modalConfig.isOpen} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} user={user} initialType={modalConfig.type} initialDate={modalConfig.date} editData={modalConfig.editData} categories={categories} paymentMethods={paymentMethods} />
              </>
            ) : <PendingApproval user={user} />
          ) : <Navigate to="/login" />
        } />
      </Routes>
    </div>
  );
}

// Sub-components (보조용)
const PendingApproval = ({ user }) => (
  <div className="main-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', textAlign: 'center' }}>
    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
      <PlusCircle size={60} color="#f59e0b" style={{ marginBottom: '20px' }} />
      <h2 style={{ margin: '0 0 10px 0' }}>승인 대기 중</h2>
      <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
        안녕하세요, <strong>{user.displayName}</strong>님!<br />
        가계부 이용을 위해서는 관리자의 승인이 필요합니다.<br />
        관리자에게 승인을 요청해 주세요.
      </p>
      <button onClick={() => signOut(auth)} className="btn" style={{ marginTop: '20px', backgroundColor: '#64748b', width: '100%' }}>로그아웃</button>
    </div>
  </div>
);

const UserManagement = ({ users, onUpdate }) => {
  return (
    <div className="main-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Link to="/settings" className="icon-btn"><ChevronLeft /></Link>
        <h2 style={{ margin: 0 }}>사용자 승인 관리</h2>
      </div>
      {users.map(u => (
        <div key={u.uid} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={u.photoURL} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%' }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{u.displayName} {u.isAdmin && <span style={{ color: '#4f46e5', fontSize: '10px' }}>(관리자)</span>}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            {!u.isAdmin && (
              <button 
                onClick={() => onUpdate(u.uid, { approved: !u.approved })} 
                className="btn" 
                style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: u.approved ? '#ef4444' : '#22c55e' }}
              >
                {u.approved ? '승인취소' : '승인하기'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
const CalendarDashboard = ({ transactions, startDay, onAddClick, onEdit }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const { start, end, label } = getPeriodDates(viewDate, startDay);
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const getDaysArray = () => {
    const arr = [];
    const firstDate = new Date(start);
    const lastDate = new Date(end);
    const curr = new Date(firstDate); curr.setDate(curr.getDate() - curr.getDay());
    const lastPadded = new Date(lastDate); lastPadded.setDate(lastPadded.getDate() + (6 - lastPadded.getDay()));
    while (curr <= lastPadded) { arr.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }
    return arr;
  };
  const periodDays = getDaysArray();
  const monthTrans = transactions.filter(t => t.date >= start && t.date <= end);
  const totalInc = monthTrans.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExp = monthTrans.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const totalInv = monthTrans.filter(t => t.type === 'investment').reduce((acc, curr) => acc + curr.amount, 0);
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
        <div className="summary-item"><span>투자</span><span className="investment-text">₩{totalInv.toLocaleString()}</span></div>
        <div className="summary-item total"><span>잔액</span><span className={totalInc - totalExp - totalInv >= 0 ? "income-text" : "expense-text"}>₩{(totalInc - totalExp - totalInv).toLocaleString()}</span></div>
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
          const dayInv = dayTrans.filter(t => t.type === 'investment').reduce((acc, curr) => acc + curr.amount, 0);
          return (
            <div key={idx} className={`calendar-day ${isSelected ? 'selected' : ''} ${isOutOfPeriod ? 'out-of-period' : ''}`} onClick={() => isOutOfPeriod ? (new Date(dateStr) < new Date(start) ? prevMonth() : nextMonth()) : setSelectedDate(dateStr)}>
              <span className="day-number">{dateObj.getDate()}</span>
              {!isOutOfPeriod && (
                <div className="day-summary">
                  {dayInc > 0 && <div className="income-small">+{dayInc.toLocaleString()}</div>}
                  {dayExp > 0 && <div className="expense-small">-{dayExp.toLocaleString()}</div>}
                  {dayInv > 0 && <div className="investment-small">*{dayInv.toLocaleString()}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="daily-detail-section" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ fontSize: '16px', margin: 0 }}>{selectedDate} 내역</h3>
          <div style={{ display: 'flex', gap: '8px' }}><button className="small-btn expense" onClick={() => onAddClick('expense', selectedDate)}>지출 +</button><button className="small-btn income" onClick={() => onAddClick('income', selectedDate)}>수입 +</button><button className="small-btn investment" onClick={() => onAddClick('investment', selectedDate)}>투자 +</button></div>
        </div>
        <div className="daily-list-container">
          {monthTrans.filter(t => t.date === selectedDate).map(t => (
            <div key={t.id} className="card transaction-item compact" onClick={() => onEdit(t)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{t.memo || t.category}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {t.category}{t.type === 'expense' && t.paymentMethod ? ` · ${t.paymentMethod}` : ''}
                  </div>
                  <div className="author-info">
                    <img src={t.userPhoto || 'https://via.placeholder.com/20'} alt={t.userName} className="author-avatar" />
                    <span className="author-name">{t.userName}</span>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', color: t.type === 'expense' ? '#ef4444' : t.type === 'income' ? '#22c55e' : '#f59e0b' }}>₩{t.amount.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const History = ({ transactions }) => {
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  
  const monthlyStats = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: `${i + 1}월`,
      income: 0,
      expense: 0,
      investment: 0,
      balance: 0
    }));

    transactions.forEach(t => {
      const tYear = t.date.substring(0, 4);
      const tMonth = parseInt(t.date.substring(5, 7), 10);
      if (tYear === String(viewYear)) {
        if (t.type === 'income') months[tMonth - 1].income += t.amount;
        else if (t.type === 'expense') months[tMonth - 1].expense += t.amount;
        else if (t.type === 'investment') months[tMonth - 1].investment += t.amount;
      }
    });

    return months.map(m => ({
      ...m,
      balance: m.income - m.expense - m.investment
    }));
  }, [transactions, viewYear]);

  const yearlyTotalInc = monthlyStats.reduce((acc, curr) => acc + curr.income, 0);
  const yearlyTotalExp = monthlyStats.reduce((acc, curr) => acc + curr.expense, 0);
  const yearlyTotalInv = monthlyStats.reduce((acc, curr) => acc + curr.investment, 0);
  const yearlyBalance = yearlyTotalInc - yearlyTotalExp - yearlyTotalInv;

  return (
    <div className="main-content">
      <div className="calendar-header" style={{ marginBottom: '20px' }}>
        <button onClick={() => setViewYear(viewYear - 1)} className="icon-btn"><ChevronLeft /></button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0 }}>{viewYear}년 내역 요약</h2>
          <div style={{ fontSize: '12px', color: '#64748b' }}>연간 월별 현황</div>
        </div>
        <button onClick={() => setViewYear(viewYear + 1)} className="icon-btn"><ChevronRight /></button>
      </div>

      {/* 연간 총계 카드 */}
      <div className="card" style={{ marginBottom: '25px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '15px 5px', textAlign: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>연 수입</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#16a34a' }}>{yearlyTotalInc.toLocaleString()}</div>
        </div>
        <div style={{ borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>연 지출</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#dc2626' }}>{yearlyTotalExp.toLocaleString()}</div>
        </div>
        <div style={{ borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>연 투자</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#d97706' }}>{yearlyTotalInv.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>누적 차액</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: yearlyBalance >= 0 ? '#4f46e5' : '#dc2626' }}>{yearlyBalance.toLocaleString()}</div>
        </div>
      </div>

      <div className="monthly-list">
        {monthlyStats.slice().reverse().map((item, index) => (
          (item.income > 0 || item.expense > 0 || item.investment > 0) && (
            <div key={index} className="card" style={{ padding: '15px', marginBottom: '12px', borderLeft: `5px solid ${item.balance >= 0 ? '#4f46e5' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '17px' }}>{item.name}</div>
                <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: 'bold', color: item.balance >= 0 ? '#4f46e5' : '#ef4444' }}>
                  {item.balance >= 0 ? '+' : ''}{item.balance.toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                <div>수입: <span style={{ color: '#16a34a', fontWeight: '500' }}>{item.income.toLocaleString()}</span></div>
                <div>지출: <span style={{ color: '#dc2626', fontWeight: '500' }}>{item.expense.toLocaleString()}</span></div>
                <div>투자: <span style={{ color: '#d97706', fontWeight: '500' }}>{item.investment.toLocaleString()}</span></div>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

const TransactionModal = ({ isOpen, onClose, user, initialType, initialDate, categories, paymentMethods, editData }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState('');
  const [memo, setMemo] = useState('');
  const [installments, setInstallments] = useState(1);
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editData) { 
        setAmount(editData.amount.toString()); 
        setType(editData.type); 
        setCategory(editData.category); 
        setPaymentMethod(editData.paymentMethod || ''); 
        setDate(editData.date); 
        setMemo(editData.memo || ''); 
        setInstallments(editData.installments || 1);
        setIsRecurring(editData.isRecurring || false);
      } else { 
        setAmount(''); 
        setType(initialType || 'expense'); 
        setDate(initialDate || formatDate(new Date())); 
        setMemo(''); 
        setInstallments(1); 
        setIsRecurring(false);
      }
    }
  }, [isOpen, editData, initialDate, initialType]);

  useEffect(() => {
    if (isOpen && !editData) {
      const filtered = categories.filter(c => c.type === type);
      if (filtered.length > 0) setCategory(filtered[0].name);
      if (type === 'expense' && paymentMethods.length > 0) setPaymentMethod(paymentMethods[0].name);
    }
  }, [type, categories, paymentMethods, isOpen, editData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault(); if (!amount) return alert('금액 입력!'); setLoading(true);
    try {
      const d = { 
        uid: user.uid, 
        userName: user.displayName, 
        userPhoto: user.photoURL, 
        type, 
        amount: parseInt(amount), 
        category, 
        paymentMethod: type === 'expense' ? paymentMethod : '', 
        date, 
        memo, 
        installments: type === 'expense' ? parseInt(installments) : 1,
        isRecurring: type === 'expense' ? isRecurring : false,
        updatedAt: serverTimestamp() 
      };
      if (editData) await updateDoc(doc(db, "transactions", editData.id), d);
      else await addDoc(collection(db, "transactions"), { ...d, createdAt: serverTimestamp() });
      onClose();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    const msg = editData.isRecurring ? '정말 삭제하시겠습니까? (연결된 모든 반복 내역이 삭제됩니다)' : (editData.installments > 1 ? '정말 삭제하시겠습니까? (할부 내역 전체가 삭제됩니다)' : '정말 삭제하시겠습니까?');
    if (!editData || !window.confirm(msg)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "transactions", editData.id));
      onClose();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header"><h3>{editData ? '내역 수정' : '내역 추가'}</h3><button onClick={onClose} className="close-btn"><X size={24} /></button></div>
        {!editData && (
          <div className="type-selector">
            <button className={type === 'expense' ? 'active expense' : ''} onClick={() => setType('expense')}>지출</button>
            <button className={type === 'income' ? 'active income' : ''} onClick={() => setType('income')}>수입</button>
            <button className={type === 'investment' ? 'active investment' : ''} onClick={() => setType('investment')}>투자</button>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>금액 {type === 'expense' && installments > 1 && `(총액, 월 ${Math.floor(amount/installments).toLocaleString()}원)`}</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required /></div>
          <div className="form-group"><label>날짜</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '120px' }}><label>카테고리</label><select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.filter(c => c.type === type).map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}</select></div>
            {type === 'expense' && <div className="form-group" style={{ flex: 1, minWidth: '120px' }}><label>결제 방법</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>{paymentMethods.map(pm => <option key={pm.id} value={pm.name}>{pm.name}</option>)}</select></div>}
            {type === 'expense' && !isRecurring && (
              <div className="form-group" style={{ flex: 1, minWidth: '120px' }}><label>할부 기간</label><select value={installments} onChange={(e) => setInstallments(e.target.value)}><option value={1}>일시불</option>{[...Array(23)].map((_, i) => <option key={i+2} value={i+2}>{i+2}개월</option>)}</select></div>
            )}
          </div>

          {type === 'expense' && installments === 1 && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <input type="checkbox" id="recurring" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <label htmlFor="recurring" style={{ margin: 0, fontSize: '15px', color: '#1e293b', fontWeight: 'bold' }}>매달 반복 결제</label>
            </div>
          )}

          <div className="form-group"><label>메모</label><input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} /></div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            {editData && (
              <button type="button" onClick={handleDelete} disabled={loading} className="btn" style={{ flex: 1, backgroundColor: '#64748b' }}>
                <Trash2 size={18} style={{ marginRight: '5px' }} /> 삭제
              </button>
            )}
            <button type="submit" disabled={loading} className="btn" style={{ flex: 2, backgroundColor: type === 'expense' ? '#ef4444' : type === 'income' ? '#22c55e' : '#f59e0b' }}>
              {loading ? '처리 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SettingsView = ({ user, userProfile, startDay, setStartDay, transactions }) => {
  const handleDeleteAll = async () => {
    if (!window.confirm('정말 모든 내역(수입, 지출, 투자)을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    alert('삭제를 시작합니다. 잠시만 기다려 주세요...');
    try {
      // 현재 불러와져 있는 모든 트랜잭션 ID를 사용하여 삭제
      const deletePromises = transactions.map(t => deleteDoc(doc(db, "transactions", t.id)));
      await Promise.all(deletePromises);
      alert('모든 내역이 성공적으로 삭제되었습니다.');
    } catch (e) {
      console.error(e);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="main-content">
      <h2>설정</h2>
      <div className="card profile-card">
        <img src={user.photoURL} alt="" />
        <div>
          <div className="u-name">{user.displayName} {userProfile?.isAdmin && <span style={{ color: '#4f46e5', fontSize: '12px' }}>(관리자)</span>}</div>
          <div className="u-email">{user.email}</div>
        </div>
      </div>
      
      <div className="card"><label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>한 달 시작일 설정</label><select value={startDay} onChange={async (e) => { const d = parseInt(e.target.value); setStartDay(d); await setDoc(doc(db, "settings", "global"), { startDay: d }, { merge: true }); }} style={{ width: '100%', padding: '10px', borderRadius: '8px' }}>{[...Array(28)].map((_, i) => <option key={i+1} value={i+1}>{i+1}일</option>)}</select></div>
      
      <Link to="/categories" className="card menu-item"><Settings2 size={24} color="#4f46e5" /><div>카테고리 관리</div></Link>
      <Link to="/payment-methods" className="card menu-item"><CreditCard size={24} color="#4f46e5" /><div>결제 수단 관리</div></Link>
      
      {userProfile?.isAdmin && (
        <Link to="/user-management" className="card menu-item" style={{ border: '1px solid #e0e7ff', backgroundColor: '#f5f7ff' }}>
          <Settings2 size={24} color="#4f46e5" />
          <div>사용자 승인 관리</div>
        </Link>
      )}

      {userProfile?.isAdmin && (
        <div className="card" style={{ marginTop: '20px', border: '1px solid #fee2e2' }}>
          <h4 style={{ color: '#ef4444', marginTop: 0 }}>데이터 관리 (위험)</h4>
          <p style={{ fontSize: '12px', color: '#64748b' }}>모든 수입, 지출, 투자 내역을 삭제합니다.</p>
          <button onClick={handleDeleteAll} className="btn" style={{ backgroundColor: '#ef4444', width: '100%', marginTop: '10px' }}>모든 내역 삭제하기</button>
        </div>
      )}

      <button onClick={() => signOut(auth)} className="btn logout-btn">로그아웃</button>
    </div>
  );
};

const ListManager = ({ title, items, onAdd, onUpdate, onDelete, backPath }) => {
  const isCategoryMode = title.includes('카테고리');
  const [newName, setNewName] = useState('');
  const [activeTab, setActiveTab] = useState('expense'); // 'expense', 'income', 'investment'
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const filteredItems = isCategoryMode 
    ? items.filter(item => item.type === activeTab)
    : items;

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName, isCategoryMode ? activeTab : null);
    setNewName('');
  };

  const handleUpdate = async (id) => {
    if (!editingName.trim()) return setEditingId(null);
    await onUpdate(id, editingName);
    setEditingId(null);
  };

  return (
    <div className="main-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Link to={backPath} className="icon-btn"><ChevronLeft /></Link>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>

      {isCategoryMode && (
        <div className="type-selector" style={{ marginBottom: '20px' }}>
          <button className={activeTab === 'expense' ? 'active expense' : ''} onClick={() => setActiveTab('expense')}>지출</button>
          <button className={activeTab === 'income' ? 'active income' : ''} onClick={() => setActiveTab('income')}>수입</button>
          <button className={activeTab === 'investment' ? 'active investment' : ''} onClick={() => setActiveTab('investment')}>투자</button>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder={isCategoryMode ? `${activeTab === 'expense' ? '지출' : activeTab === 'income' ? '수입' : '투자'} 카테고리 추가` : "추가"} 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
          />
          <button type="submit" className="btn" style={{ padding: '10px' }}><Plus /></button>
        </form>
      </div>

      <div className="category-list">
        {filteredItems.length > 0 ? (
          filteredItems.map(i => (
            <div key={i.id} className="card transaction-item compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', marginBottom: '10px' }}>
              {editingId === i.id ? (
                <div style={{ display: 'flex', gap: '10px', flex: 1, marginRight: '10px' }}>
                  <input 
                    type="text" 
                    value={editingName} 
                    onChange={(e) => setEditingName(e.target.value)} 
                    autoFocus
                    style={{ flex: 1, padding: '5px 10px', borderRadius: '6px', border: '1px solid #4f46e5' }}
                  />
                  <button onClick={() => handleUpdate(i.id)} className="icon-btn" style={{ color: '#22c55e' }}><X size={20} style={{ transform: 'rotate(45deg)' }} /></button>
                  <button onClick={() => setEditingId(null)} className="icon-btn" style={{ color: '#94a3b8' }}><X size={20} /></button>
                </div>
              ) : (
                <>
                  <span style={{ fontWeight: '500' }}>{i.name}</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => { setEditingId(i.id); setEditingName(i.name); }} className="delete-btn" style={{ color: '#64748b' }}><Edit2 size={16} /></button>
                    <button onClick={() => onDelete(i.id)} className="delete-btn"><Trash2 size={16} /></button>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
            {isCategoryMode ? `${activeTab === 'expense' ? '지출' : activeTab === 'income' ? '수입' : '투자'} 카테고리가 없습니다.` : "데이터가 없습니다."}
          </div>
        )}
      </div>
    </div>
  );
};

const Login = () => {
  const handleGoogleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  return (
    <div className="main-content login-view"><h1>Sweet Home</h1><p>우리 집 가계부</p><button onClick={handleGoogleLogin} className="btn login-btn" style={{ marginTop: '20px' }}>구글로 시작하기</button></div>
  );
};

export default App;
