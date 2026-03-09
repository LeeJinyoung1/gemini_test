import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * App 컴포넌트 렌더링을 테스트합니다.
 * 참고: 현재 App은 인증 흐름과 Firebase 초기화가 필요하므로, 실제 환경에서는 모킹이 필요할 수 있습니다.
 */
test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
