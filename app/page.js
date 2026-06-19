'use client'
import { useState } from 'react'

const TRANSPORT_OPTIONS = ['도보', '대중교통', '택시/그랩', '렌트카', '기차']
const START_TIME_OPTIONS = ['종일 (09:00~)', '오후부터 (13:00~)', '저녁만 (18:00~)']
const BUDGET_OPTIONS = ['$30 이하 (저예산)', '$50 (보통)', '$100 (여유)', '$200+ (럭셔리)']

const POPULAR_CITIES = [
  { name: '방콕', country: '태국', flag: '🇹🇭', color: '#C62828' },
  { name: '도쿄', country: '일본', flag: '🇯🇵', color: '#B71C1C' },
  { name: '오사카', country: '일본', flag: '🇯🇵', color: '#E65100' },
  { name: '싱가포르', country: '싱가포르', flag: '🇸🇬', color: '#1565C0' },
  { name: '발리', country: '인도네시아', flag: '🇮🇩', color: '#2E7D32' },
  { name: '파리', country: '프랑스', flag: '🇫🇷', color: '#283593' },
  { name: '로마', country: '이탈리아', flag: '🇮🇹', color: '#880E4F' },
  { name: '바르셀로나', country: '스페인', flag: '🇪🇸', color: '#BF360C' },
  { name: '암스테르담', country: '네덜란드', flag: '🇳🇱', color: '#004D40' },
  { name: '이스탄불', country: '튀르키예', flag: '🇹🇷', color: '#6A1B9A' },
  { name: '두바이', country: 'UAE', flag: '🇦🇪', color: '#37474F' },
  { name: '뉴욕', country: '미국', flag: '🇺🇸', color: '#1A237E' },
]

export default function Home() {
  const [step, setStep] = useState(1) // 1:기본설정 2:루트설정 3:결과
  const [travelers, setTravelers] = useState(2)
  const [budget, setBudget] = useState('$50 (보통)')
  const [cities, setCities] = useState([])
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [customCity, setCustomCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('plan')
  const [foodData, setFoodData] = useState(null)
  const [activitiesData, setActivitiesData] = useState(null)
  const [error, setError] = useState(null)

  function addCity(city) {
    const startDay = cities.reduce((sum, c) => sum + c.days, 1)
    setCities([...cities, {
      ...city,
      days: 3,
      startDay,
      endDay: startDay + 2,
      hotel: '',
      transport: '대중교통',
      startTime: '종일 (09:00~)',
    }])
    setShowCityPicker(false)
    setCustomCity('')
  }

  function addCustomCity() {
    if (!customCity.trim()) return
    addCity({ name: customCity, country: '직접입력', flag: '🌍', color: '#333' })
  }

  function updateCity(idx, field, value) {
    const updated = [...cities]
    updated[idx][field] = value
    // recalc days
    if (field === 'days') {
      let day = 1
      updated.forEach(c => {
        c.startDay = day
        c.endDay = day + Number(c.days) - 1
        day += Number(c.days)
      })
    }
    setCities(updated)
  }

  function removeCity(idx) {
    const updated = cities.filter((_, i) => i !== idx)
    let day = 1
    updated.forEach(c => {
      c.startDay = day
      c.endDay = day + Number(c.days) - 1
      day += Number(c.days)
    })
    setCities(updated)
  }

  function moveCity(idx, dir) {
    const updated = [...cities]
    const target = idx + dir
    if (target < 0 || target >= updated.length) return
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    let day = 1
    updated.forEach(c => {
      c.startDay = day
      c.endDay = day + Number(c.days) - 1
      day += Number(c.days)
    })
    setCities(updated)
  }

  const totalDays = cities.reduce((sum, c) => sum + Number(c.days), 0)

  async function generate() {
    if (cities.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'itinerary', data: { cities, travelers, budget } })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setResult(json.data)
      setStep(3)
      setActiveTab('plan')
      loadFoodAndActivities()
    } catch (e) {
      setError('일정 생성 실패: ' + e.message)
    }
    setLoading(false)
  }

  async function loadFoodAndActivities() {
    if (cities.length === 0) return
    const firstCity = cities[0]
    try {
      const [fRes, aRes] = await Promise.all([
        fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'food', data: { city: firstCity.name, budget, travelers } }) }),
        fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'activities', data: { city: firstCity.name, budget, travelers } }) })
      ])
      const fJson = await fRes.json()
      const aJson = await aRes.json()
      if (fJson.success) setFoodData(fJson.data)
      if (aJson.success) setActivitiesData(aJson.data)
    } catch (e) {}
  }

  const chipStyle = (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 3,
    fontSize: 11, padding: '3px 9px', borderRadius: 20,
    textDecoration: 'none', fontWeight: 500, color: 'white',
    background: color, marginRight: 4, marginTop: 4
  })

  const typeColor = { attraction: '#4285F4', food: '#FF6B35', transport: '#555', hotel: '#9C27B0' }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 16px', minHeight: '100vh' }}>
      <div style={{ maxWidth: 460, width: '100%', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minHeight: '100vh' }}>

        {/* HEADER */}
        <div style={{ background: cities.length > 0 ? cities[0].color : '#222', padding: '16px', color: 'white', transition: 'background 0.4s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>🧳 tripAI</div>
            {step === 3 && <button onClick={() => { setStep(1); setResult(null); setCities([]) }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>새 여행</button>}
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            {step === 1 && '기본 정보를 설정해주세요'}
            {step === 2 && `${totalDays}일 여행 · ${cities.length}개 도시`}
            {step === 3 && result && `${cities.map(c => c.flag + c.name).join(' → ')} · ${totalDays}일`}
          </div>
        </div>

        {/* STEP 1: 기본 설정 */}
        {step === 1 && (
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#111' }}>여행 기본 설정</div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>👥 동행 인원</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <button key={n} onClick={() => setTravelers(n)} style={{
                    width: 44, height: 44, borderRadius: 10, border: travelers === n ? '2px solid #111' : '1px solid #ddd',
                    background: travelers === n ? '#111' : '#fff', color: travelers === n ? 'white' : '#111',
                    fontSize: 14, fontWeight: 500, cursor: 'pointer'
                  }}>{n}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>💰 1인 하루 예산</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {BUDGET_OPTIONS.map(b => (
                  <button key={b} onClick={() => setBudget(b)} style={{
                    padding: '11px 14px', borderRadius: 10, border: budget === b ? '2px solid #111' : '1px solid #ddd',
                    background: budget === b ? '#111' : '#fff', color: budget === b ? 'white' : '#111',
                    fontSize: 13, cursor: 'pointer', textAlign: 'left'
                  }}>{b}</button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(2)} style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: '#111', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer'
            }}>다음 → 여행 루트 설정</button>
          </div>
        )}

        {/* STEP 2: 루트 설정 */}
        {step === 2 && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>여행 루트</div>
              <button onClick={() => setStep(1)} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← 이전</button>
            </div>

            {/* 도시 리스트 */}
            {cities.map((city, idx) => (
              <div key={idx} style={{ border: '1px solid #efefef', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 22 }}>{city.flag}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{city.name}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>Day {city.startDay} ~ Day {city.endDay}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {idx > 0 && <button onClick={() => moveCity(idx, -1)} style={{ background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>↑</button>}
                    {idx < cities.length - 1 && <button onClick={() => moveCity(idx, 1)} style={{ background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>↓</button>}
                    <button onClick={() => removeCity(idx)} style={{ background: '#fff0f0', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: '#e53' }}>✕</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>기간 (일)</div>
                    <input type="number" min="1" max="30" value={city.days}
                      onChange={e => updateCity(idx, 'days', e.target.value)}
                      style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>이동수단</div>
                    <select value={city.transport} onChange={e => updateCity(idx, 'transport', e.target.value)}
                      style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                      {TRANSPORT_OPTIONS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>🏨 숙소 위치 (지역명 or 호텔명)</div>
                  <input type="text" placeholder="예: 카오산로드 근처, 시암 지역, 신주쿠..."
                    value={city.hotel} onChange={e => updateCity(idx, 'hotel', e.target.value)}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>

                <div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>⏰ 일정 시작</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {START_TIME_OPTIONS.map(t => (
                      <button key={t} onClick={() => updateCity(idx, 'startTime', t)} style={{
                        fontSize: 11, padding: '5px 10px', borderRadius: 20,
                        border: city.startTime === t ? '2px solid #111' : '1px solid #ddd',
                        background: city.startTime === t ? '#111' : '#fff',
                        color: city.startTime === t ? 'white' : '#555', cursor: 'pointer'
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* 도시 추가 */}
            <button onClick={() => setShowCityPicker(true)} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: '1.5px dashed #ddd',
              background: '#fafafa', color: '#888', fontSize: 14, cursor: 'pointer', marginBottom: 16
            }}>+ 도시 추가</button>

            {cities.length > 0 && (
              <button onClick={generate} disabled={loading} style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: loading ? '#ccc' : '#111', color: 'white', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
              }}>
                {loading ? '✨ AI 일정 생성 중...' : `✨ ${totalDays}일 일정 생성`}
              </button>
            )}

            {error && <div style={{ marginTop: 12, padding: 12, background: '#fff0f0', borderRadius: 10, fontSize: 13, color: '#e53' }}>{error}</div>}
          </div>
        )}

        {/* CITY PICKER */}
        {showCityPicker && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 460, maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>✈️ 도시 선택</div>
                <button onClick={() => setShowCityPicker(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={customCity} onChange={e => setCustomCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomCity()}
                  placeholder="직접 입력 (예: 프라하, 리스본, 시드니...)"
                  style={{ flex: 1, border: '1px solid #ddd', borderRadius: 10, padding: '10px 14px', fontSize: 14 }} />
                <button onClick={addCustomCity} style={{ background: '#111', color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, cursor: 'pointer' }}>선택</button>
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8, fontWeight: 500 }}>인기 도시</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {POPULAR_CITIES.map((c, i) => (
                  <button key={i} onClick={() => addCity(c)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    border: '1px solid #eee', borderRadius: 12, background: '#fff', cursor: 'pointer', textAlign: 'left'
                  }}>
                    <span style={{ fontSize: 22 }}>{c.flag}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{c.country}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: 결과 */}
        {step === 3 && result && (
          <>
            {/* NAV */}
            <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
              {[['plan','📅 일정'],['map','🗺️ 지도'],['food','🍽️ 식당'],['book','🎟️ 예약']].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{
                  flex: 1, padding: '12px 4px', fontSize: 11, color: activeTab === id ? '#111' : '#aaa',
                  border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === id ? '2px solid #111' : '2px solid transparent',
                  fontWeight: activeTab === id ? 600 : 400
                }}>{label}</button>
              ))}
            </div>

            <div style={{ padding: 16 }}>

              {/* 일정 탭 */}
              {activeTab === 'plan' && (
                <div>
                  {result.days.map((day, i) => (
                    <div key={i} style={{ border: '1px solid #efefef', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ background: '#111', color: 'white', fontSize: 11, padding: '3px 9px', borderRadius: 20 }}>Day {day.day}</span>
                        <span style={{ fontSize: 14 }}>{day.flag}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{day.theme}</div>
                          <div style={{ fontSize: 11, color: '#aaa' }}>{day.city} · 숙소: {day.hotel}</div>
                        </div>
                      </div>
                      {day.slots.map((slot, j) => (
                        <div key={j} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: j < day.slots.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                          <div style={{ fontSize: 11, color: '#bbb', minWidth: 38, paddingTop: 2 }}>{slot.time}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{slot.name}</div>
                            <div style={{ fontSize: 12, color: '#777', marginTop: 1 }}>{slot.desc}</div>
                            {slot.budget && <div style={{ fontSize: 11, color: '#00897B', marginTop: 2 }}>💰 {slot.budget}</div>}
                            <div>
                              {slot.klook && <a href={`https://www.klook.com/en-US/search/?query=${slot.klook}`} target="_blank" style={chipStyle('#FF6B35')}>Klook</a>}
                              {slot.maps && <a href={`https://www.google.com/maps/search/${slot.maps}`} target="_blank" style={chipStyle('#4285F4')}>지도</a>}
                              {slot.transport && <a href="https://www.grab.com" target="_blank" style={chipStyle('#00B14F')}>Grab</a>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* 지도 탭 */}
              {activeTab === 'map' && (
                <div>
                  {cities.map((city, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 8 }}>{city.flag} {city.name}</div>
                      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #efefef' }}>
                        <iframe
                          src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=${city.hotel ? city.hotel + ' ' + city.name : city.name}&zoom=13`}
                          width="100%" height="200" style={{ border: 'none', display: 'block' }} allowFullScreen loading="lazy" />
                      </div>
                      <a href={`https://www.google.com/maps/search/${city.name}`} target="_blank"
                        style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12, color: '#4285F4', textDecoration: 'none' }}>
                        구글맵에서 크게 보기 →
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* 식당 탭 */}
              {activeTab === 'food' && (
                <div>
                  {!foodData ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <div style={{ width: 28, height: 28, border: '2px solid #eee', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                      <div style={{ fontSize: 13, color: '#888' }}>맛집 불러오는 중...</div>
                    </div>
                  ) : foodData.restaurants.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, border: '1px solid #efefef', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                      <div style={{ width: 54, height: 54, borderRadius: 10, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{r.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: '#F4A015' }}>{r.stars}</div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{r.meta}</div>
                        {r.budget && <div style={{ fontSize: 11, color: '#00897B', marginTop: 2 }}>💰 {r.budget}</div>}
                        <div style={{ marginTop: 6 }}>
                          <a href={`https://www.google.com/maps/search/${r.maps}`} target="_blank" style={chipStyle('#4285F4')}>지도</a>
                          <a href={`https://www.klook.com/en-US/search/?query=${r.maps}+restaurant`} target="_blank" style={chipStyle('#FF5722')}>리뷰</a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 예약 탭 */}
              {activeTab === 'book' && (
                <div>
                  {!activitiesData ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <div style={{ width: 28, height: 28, border: '2px solid #eee', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                      <div style={{ fontSize: 13, color: '#888' }}>액티비티 불러오는 중...</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ border: '1px solid #efefef', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 12 }}>🎟️ 추천 액티비티</div>
                        {activitiesData.activities.map((a, i) => (
                          <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < activitiesData.activities.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{a.emoji} {a.name}</div>
                            <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>{a.desc}</div>
                            {a.budget && <div style={{ fontSize: 11, color: '#00897B', marginTop: 2 }}>💰 {a.budget} · ⏱️ {a.duration}</div>}
                            <div style={{ marginTop: 6 }}>
                              <a href={`https://www.klook.com/en-US/search/?query=${a.klook}`} target="_blank" style={chipStyle('#FF6B35')}>Klook 예약</a>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ border: '1px solid #efefef', borderRadius: 14, padding: 14 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 12 }}>🚗 교통</div>
                        {[
                          { name: 'Grab', desc: '동남아 택시 앱', url: 'https://www.grab.com', color: '#00B14F' },
                          { name: 'Uber', desc: '글로벌 택시 앱', url: 'https://www.uber.com', color: '#000' },
                          { name: 'Google Maps', desc: '대중교통 경로', url: `https://www.google.com/maps`, color: '#4285F4' },
                        ].map((t, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid #f5f5f5' : 'none' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{t.name}</div>
                              <div style={{ fontSize: 12, color: '#888' }}>{t.desc}</div>
                            </div>
                            <a href={t.url} target="_blank" style={{ ...chipStyle(t.color), marginTop: 0 }}>열기</a>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </>
        )}

        {/* 로딩 오버레이 */}
        {loading && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <div style={{ color: 'white', fontSize: 15, fontWeight: 500 }}>AI가 최적 동선으로 일정 생성 중...</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>숙소 위치 기반으로 계산 중이에요</div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
