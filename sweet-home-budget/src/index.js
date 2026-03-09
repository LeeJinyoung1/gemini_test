import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

/**
 * React 앱의 진입점(Entry Point)입니다.
 * React StrictMode, React Router(BrowserRouter)가 설정되어 있습니다.
 */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);

// PWA 지원을 위한 서비스 워커 등록
serviceWorkerRegistration.register();

// 앱의 웹 성능 측정을 위한 함수 호출
reportWebVitals();
