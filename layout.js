export const metadata = {
  title: 'tripAI — AI 여행 플래너',
  description: 'AI가 숙소 위치 기반으로 최적 동선 여행 일정을 자동 생성해드립니다',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: '#f0f0f0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
