'use client'
import { useState } from 'react'

const TRANSPORT_OPTIONS = ['도보', '대중교통', '택시/그랩', '렌트카', '기차']
const START_TIME_OPTIONS = ['종일 (09:00~)', '오후부터 (13:00~)', '저녁만 (18:00~)']
const BUDGET_OPTIONS = ['$30 이하 (저예산)', '$50 (보통)', '$100 (여유)', '$200+ (럭셔리)']

const POPULAR_CITIES = [
  { name:'방콕', country:'태국', flag:'🇹🇭', color:'#C62828' },
  { name:'도쿄', country:'일본', flag:'🇯🇵', color:'#B71C1C' },
  { name:'오사카', country:'일본', flag:'🇯🇵', color:'#E65100' },
  { name:'싱가포르', country:'싱가포르', flag:'🇸🇬', color:'#1565C0' },
  { name:'발리', country:'인도네시아', flag:'🇮🇩', color:'#2E7D32' },
  { name:'파리', country:'프랑스', flag:'🇫🇷', color:'#283593' },
  { name:'로마', country:'이탈리아', flag:'🇮🇹', color:'#880E4F' },
  { name:'바르셀로나', country:'스페인', flag:'🇪🇸', color:'#BF360C' },
  { name:'암스테르담', country:'네덜란드', flag:'🇳🇱', color:'#004D40' },
  { name:'이스탄불', country:'튀르키예', flag:'🇹🇷', color:'#6A1B9A' },
  { name:'두바이', country:'UAE', flag:'🇦🇪', color:'#37474F' },
  { name:'뉴욕', country:'미국', flag:'🇺🇸', color:'#1A237E' },
  { name:'홍콩', country:'홍콩', flag:'🇭🇰', color:'#B71C1C' },
  { name:'런던', country:'영국', flag:'🇬🇧', color:'#1A237E' },
]

const chip = (color) => ({
  display:'inline-flex', alignItems:'center', gap:3, fontSize:11,
  padding:'3px 9px', borderRadius:20, textDecoration:'none',
  fontWeight:500, color:'white', background:color, marginRight:4, marginTop:4
})
const card = { border:'1px solid #efefef', borderRadius:14, padding:14, marginBottom:10 }
const label = { fontSize:11, color:'#aaa', marginBottom:6 }
const input = { width:'100%', border:'1px solid #ddd', borderRadius:8, padding:'8px 10px', fontSize:13, boxSizing:'border-box' }

export default function Home() {
  const [step, setStep] = useState(1)
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
  const [tipsData, setTipsData] = useState(null)
  const [error, setError] = useState(null)

  // 항공편
  const [flight, setFlight] = useState({
    enabled: false,
    outbound: { fromAirport:'ICN', toAirport:'', date:'', time:'', arrivalDate:'', arrivalTime:'', hasLayover:false, layoverAirport:'', layoverHours:'' },
    inbound: { fromAirport:'', toAirport:'ICN', date:'', time:'', arrivalDate:'', arrivalTime:'' }
  })

  function updateFlight(direction, field, value) {
    setFlight(f => ({ ...f, [direction]: { ...f[direction], [field]: value } }))
  }

  function addCity(city) {
    const startDay = cities.reduce((sum,c)=>sum+Number(c.days),1)
    setCities([...cities, {
      ...city, days:3, startDay, endDay:startDay+2,
      hotels:[{ checkin:startDay, name:'' }],
      transport:'대중교통', startTime:'종일 (09:00~)',
    }])
    setShowCityPicker(false)
    setCustomCity('')
  }

  function addCustomCity() {
    if (!customCity.trim()) return
    addCity({ name:customCity, country:'직접입력', flag:'🌍', color:'#333' })
  }

  function updateCity(idx, field, value) {
    const updated=[...cities]
    updated[idx][field]=value
    if (field==='days') {
      let day=1
      updated.forEach(c=>{ c.startDay=day; c.endDay=day+Number(c.days)-1; day+=Number(c.days) })
    }
    setCities(updated)
  }

  function removeCity(idx) {
    const updated=cities.filter((_,i)=>i!==idx)
    let day=1
    updated.forEach(c=>{ c.startDay=day; c.endDay=day+Number(c.days)-1; day+=Number(c.days) })
    setCities(updated)
  }

  function moveCity(idx, dir) {
    const updated=[...cities]; const t=idx+dir
    if(t<0||t>=updated.length) return
    ;[updated[idx],updated[t]]=[updated[t],updated[idx]]
    let day=1
    updated.forEach(c=>{ c.startDay=day; c.endDay=day+Number(c.days)-1; day+=Number(c.days) })
    setCities(updated)
  }

  function addHotel(cityIdx) {
    const updated=[...cities]
    const city=updated[cityIdx]
    const lastCheckin=city.hotels[city.hotels.length-1].checkin
    const nextCheckin=Math.min(Number(lastCheckin)+1, city.endDay)
    city.hotels=[...city.hotels,{ checkin:nextCheckin, name:'' }]
    setCities(updated)
  }

  function updateHotel(cityIdx, hotelIdx, field, value) {
    const updated=[...cities]
    updated[cityIdx].hotels[hotelIdx][field]=value
    setCities(updated)
  }

  function removeHotel(cityIdx, hotelIdx) {
    const updated=[...cities]
    if(updated[cityIdx].hotels.length<=1) return
    updated[cityIdx].hotels=updated[cityIdx].hotels.filter((_,i)=>i!==hotelIdx)
    setCities(updated)
  }

  const totalDays=cities.reduce((sum,c)=>sum+Number(c.days),0)

  async function generate() {
    if(!cities.length) return
    setLoading(true); setError(null)
    try {
      const res=await fetch('/api/generate',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ type:'itinerary', data:{ cities, travelers, budget, flight } })
      })
      const json=await res.json()
      if(!json.success) throw new Error(json.error)
      setResult(json.data)
      setStep(3)
      setActiveTab('plan')
      setFoodData(null); setActivitiesData(null); setTipsData(null)
      loadExtras()
    } catch(e) { setError('일정 생성 실패: '+e.message) }
    setLoading(false)
  }

  async function loadExtras() {
    if(!cities.length) return
    const firstCity=cities[0]
    const uniqueCountries=[...new Set(cities.map(c=>c.name))]
    try {
      const [fRes,aRes,tRes]=await Promise.all([
        fetch('/api/generate',{ method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ type:'food', data:{ city:firstCity.name, budget, travelers } }) }),
        fetch('/api/generate',{ method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ type:'activities', data:{ city:firstCity.name, budget, travelers } }) }),
        fetch('/api/generate',{ method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ type:'tips', data:{ countries:uniqueCountries } }) }),
      ])
      const [fj,aj,tj]=await Promise.all([fRes.json(),aRes.json(),tRes.json()])
      if(fj.success) setFoodData(fj.data)
      if(aj.success) setActivitiesData(aj.data)
      if(tj.success) setTipsData(tj.data)
    } catch(e){}
  }

  const Spinner=()=>(
    <div style={{textAlign:'center',padding:40}}>
      <div style={{width:28,height:28,border:'2px solid #eee',borderTopColor:'#111',borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 12px'}}/>
      <div style={{fontSize:13,color:'#888'}}>불러오는 중...</div>
    </div>
  )

  return (
    <div style={{display:'flex',justifyContent:'center',padding:'20px 16px',minHeight:'100vh'}}>
      <div style={{maxWidth:460,width:'100%',background:'#fff',borderRadius:20,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.12)',minHeight:'100vh'}}>

        {/* HEADER */}
        <div style={{background:cities.length>0?cities[0].color:'#222',padding:16,color:'white',transition:'background 0.4s'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <div style={{fontSize:20,fontWeight:600}}>🧳 tripAI</div>
            {step===3&&<button onClick={()=>{setStep(1);setResult(null);setCities([]);setFlight({enabled:false,outbound:{fromAirport:'ICN',toAirport:'',date:'',time:'',arrivalDate:'',arrivalTime:'',hasLayover:false,layoverAirport:'',layoverHours:''},inbound:{fromAirport:'',toAirport:'ICN',date:'',time:'',arrivalDate:'',arrivalTime:''}})}} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'white',borderRadius:8,padding:'6px 12px',fontSize:12,cursor:'pointer'}}>새 여행</button>}
          </div>
          <div style={{fontSize:13,opacity:0.8}}>
            {step===1&&'기본 정보를 설정해주세요'}
            {step===2&&`${totalDays}일 여행 · ${cities.length}개 도시`}
            {step===3&&result&&`${cities.map(c=>c.flag+c.name).join(' → ')} · ${totalDays}일`}
          </div>
        </div>

        {/* STEP 1: 기본설정 + 항공편 */}
        {step===1&&(
          <div style={{padding:20}}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:16,color:'#111'}}>여행 기본 설정</div>

            {/* 동행인원 */}
            <div style={{marginBottom:20}}>
              <div style={label}>👥 동행 인원</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {[1,2,3,4,5,6].map(n=>(
                  <button key={n} onClick={()=>setTravelers(n)} style={{width:44,height:44,borderRadius:10,border:travelers===n?'2px solid #111':'1px solid #ddd',background:travelers===n?'#111':'#fff',color:travelers===n?'white':'#111',fontSize:14,fontWeight:500,cursor:'pointer'}}>{n}</button>
                ))}
              </div>
            </div>

            {/* 예산 */}
            <div style={{marginBottom:24}}>
              <div style={label}>💰 1인 하루 예산</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {BUDGET_OPTIONS.map(b=>(
                  <button key={b} onClick={()=>setBudget(b)} style={{padding:'11px 14px',borderRadius:10,border:budget===b?'2px solid #111':'1px solid #ddd',background:budget===b?'#111':'#fff',color:budget===b?'white':'#111',fontSize:13,cursor:'pointer',textAlign:'left'}}>{b}</button>
                ))}
              </div>
            </div>

            {/* 항공편 */}
            <div style={{marginBottom:24}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:500,color:'#111'}}>✈️ 항공편 입력 <span style={{fontSize:11,color:'#aaa',fontWeight:400}}>(선택)</span></div>
                <button onClick={()=>setFlight(f=>({...f,enabled:!f.enabled}))} style={{fontSize:12,padding:'5px 12px',borderRadius:20,border:'1px solid #ddd',background:flight.enabled?'#111':'#fff',color:flight.enabled?'white':'#888',cursor:'pointer'}}>
                  {flight.enabled?'입력 중 ✓':'추가하기'}
                </button>
              </div>

              {flight.enabled&&(
                <div style={{background:'#f7f7f7',borderRadius:14,padding:14}}>
                  {/* 가는편 */}
                  <div style={{fontSize:12,fontWeight:600,color:'#111',marginBottom:10}}>🛫 가는 편</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                    <div>
                      <div style={label}>출발 공항</div>
                      <input style={input} value={flight.outbound.fromAirport} onChange={e=>updateFlight('outbound','fromAirport',e.target.value)} placeholder="ICN"/>
                    </div>
                    <div>
                      <div style={label}>도착 공항</div>
                      <input style={input} value={flight.outbound.toAirport} onChange={e=>updateFlight('outbound','toAirport',e.target.value)} placeholder="BKK"/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                    <div>
                      <div style={label}>출발 날짜</div>
                      <input type="date" style={input} value={flight.outbound.date} onChange={e=>updateFlight('outbound','date',e.target.value)}/>
                    </div>
                    <div>
                      <div style={label}>출발 시간</div>
                      <input type="time" style={input} value={flight.outbound.time} onChange={e=>updateFlight('outbound','time',e.target.value)}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                    <div>
                      <div style={label}>도착 날짜</div>
                      <input type="date" style={input} value={flight.outbound.arrivalDate} onChange={e=>updateFlight('outbound','arrivalDate',e.target.value)}/>
                    </div>
                    <div>
                      <div style={label}>도착 시간</div>
                      <input type="time" style={input} value={flight.outbound.arrivalTime} onChange={e=>updateFlight('outbound','arrivalTime',e.target.value)}/>
                    </div>
                  </div>

                  {/* 경유 */}
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:flight.outbound.hasLayover?10:16}}>
                    <input type="checkbox" id="layover" checked={flight.outbound.hasLayover} onChange={e=>updateFlight('outbound','hasLayover',e.target.checked)} style={{width:16,height:16}}/>
                    <label htmlFor="layover" style={{fontSize:12,color:'#555',cursor:'pointer'}}>경유 있음</label>
                  </div>
                  {flight.outbound.hasLayover&&(
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
                      <div>
                        <div style={label}>경유 공항</div>
                        <input style={input} value={flight.outbound.layoverAirport} onChange={e=>updateFlight('outbound','layoverAirport',e.target.value)} placeholder="HKG"/>
                      </div>
                      <div>
                        <div style={label}>대기 시간 (시간)</div>
                        <input type="number" style={input} value={flight.outbound.layoverHours} onChange={e=>updateFlight('outbound','layoverHours',e.target.value)} placeholder="4"/>
                      </div>
                    </div>
                  )}

                  {/* 오는편 */}
                  <div style={{borderTop:'1px solid #e8e8e8',paddingTop:12,marginTop:4}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#111',marginBottom:10}}>🛬 오는 편</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                      <div>
                        <div style={label}>출발 공항</div>
                        <input style={input} value={flight.inbound.fromAirport} onChange={e=>updateFlight('inbound','fromAirport',e.target.value)} placeholder="BKK"/>
                      </div>
                      <div>
                        <div style={label}>도착 공항</div>
                        <input style={input} value={flight.inbound.toAirport} onChange={e=>updateFlight('inbound','toAirport',e.target.value)} placeholder="ICN"/>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                      <div>
                        <div style={label}>출발 날짜</div>
                        <input type="date" style={input} value={flight.inbound.date} onChange={e=>updateFlight('inbound','date',e.target.value)}/>
                      </div>
                      <div>
                        <div style={label}>출발 시간</div>
                        <input type="time" style={input} value={flight.inbound.time} onChange={e=>updateFlight('inbound','time',e.target.value)}/>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      <div>
                        <div style={label}>도착 날짜</div>
                        <input type="date" style={input} value={flight.inbound.arrivalDate} onChange={e=>updateFlight('inbound','arrivalDate',e.target.value)}/>
                      </div>
                      <div>
                        <div style={label}>도착 시간</div>
                        <input type="time" style={input} value={flight.inbound.arrivalTime} onChange={e=>updateFlight('inbound','arrivalTime',e.target.value)}/>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button onClick={()=>setStep(2)} style={{width:'100%',padding:14,borderRadius:12,border:'none',background:'#111',color:'white',fontSize:15,fontWeight:600,cursor:'pointer'}}>다음 → 여행 루트 설정</button>
          </div>
        )}

        {/* STEP 2: 루트 설정 */}
        {step===2&&(
          <div style={{padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:600,color:'#111'}}>여행 루트</div>
              <button onClick={()=>setStep(1)} style={{fontSize:12,color:'#888',background:'none',border:'none',cursor:'pointer'}}>← 이전</button>
            </div>

            {cities.map((city,idx)=>(
              <div key={idx} style={card}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <span style={{fontSize:22}}>{city.flag}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#111'}}>{city.name}</div>
                    <div style={{fontSize:11,color:'#aaa'}}>Day {city.startDay} ~ Day {city.endDay}</div>
                  </div>
                  <div style={{display:'flex',gap:4}}>
                    {idx>0&&<button onClick={()=>moveCity(idx,-1)} style={{background:'#f5f5f5',border:'none',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:12}}>↑</button>}
                    {idx<cities.length-1&&<button onClick={()=>moveCity(idx,1)} style={{background:'#f5f5f5',border:'none',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:12}}>↓</button>}
                    <button onClick={()=>removeCity(idx)} style={{background:'#fff0f0',border:'none',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:12,color:'#e53'}}>✕</button>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                  <div>
                    <div style={label}>기간 (일)</div>
                    <input type="number" min="1" max="30" value={city.days} onChange={e=>updateCity(idx,'days',e.target.value)} style={input}/>
                  </div>
                  <div>
                    <div style={label}>이동수단</div>
                    <select value={city.transport} onChange={e=>updateCity(idx,'transport',e.target.value)} style={{...input,padding:'8px 10px'}}>
                      {TRANSPORT_OPTIONS.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{marginBottom:10}}>
                  <div style={label}>🏨 숙소 (체크인 기준)</div>
                  {city.hotels.map((hotel,hIdx)=>(
                    <div key={hIdx} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}>
                      <div style={{fontSize:11,color:'#888',whiteSpace:'nowrap'}}>Day</div>
                      <input type="number" min={city.startDay} max={city.endDay} value={hotel.checkin}
                        onChange={e=>updateHotel(idx,hIdx,'checkin',Number(e.target.value))}
                        style={{width:52,border:'1px solid #ddd',borderRadius:8,padding:'7px 8px',fontSize:13,textAlign:'center'}}/>
                      <input type="text" placeholder="숙소명 또는 지역 (예: 탁심 근처 / 그랜드 하얏트)"
                        value={hotel.name} onChange={e=>updateHotel(idx,hIdx,'name',e.target.value)}
                        style={{flex:1,border:'1px solid #ddd',borderRadius:8,padding:'7px 10px',fontSize:13}}/>
                      {city.hotels.length>1&&(
                        <button onClick={()=>removeHotel(idx,hIdx)} style={{background:'none',border:'none',color:'#ccc',cursor:'pointer',fontSize:16,padding:'0 4px'}}>✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={()=>addHotel(idx)} style={{fontSize:12,color:'#888',background:'none',border:'1px dashed #ddd',borderRadius:8,padding:'6px 12px',cursor:'pointer',marginTop:2}}>+ 숙소 추가</button>
                </div>

                <div>
                  <div style={label}>⏰ 일정 시작</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {START_TIME_OPTIONS.map(t=>(
                      <button key={t} onClick={()=>updateCity(idx,'startTime',t)} style={{fontSize:11,padding:'5px 10px',borderRadius:20,border:city.startTime===t?'2px solid #111':'1px solid #ddd',background:city.startTime===t?'#111':'#fff',color:city.startTime===t?'white':'#555',cursor:'pointer'}}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={()=>setShowCityPicker(true)} style={{width:'100%',padding:12,borderRadius:12,border:'1.5px dashed #ddd',background:'#fafafa',color:'#888',fontSize:14,cursor:'pointer',marginBottom:16}}>+ 도시 추가</button>

            {cities.length>0&&(
              <button onClick={generate} disabled={loading} style={{width:'100%',padding:14,borderRadius:12,border:'none',background:loading?'#ccc':'#111',color:'white',fontSize:15,fontWeight:600,cursor:loading?'not-allowed':'pointer'}}>
                {loading?'✨ AI 일정 생성 중...':`✨ ${totalDays}일 일정 생성`}
              </button>
            )}
            {error&&<div style={{marginTop:12,padding:12,background:'#fff0f0',borderRadius:10,fontSize:13,color:'#e53'}}>{error}</div>}
          </div>
        )}

        {/* CITY PICKER */}
        {showCityPicker&&(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>e.target===e.currentTarget&&setShowCityPicker(false)}>
            <div style={{background:'#fff',borderRadius:'20px 20px 0 0',padding:20,width:'100%',maxWidth:460,maxHeight:'70vh',overflowY:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
                <div style={{fontSize:16,fontWeight:600}}>✈️ 도시 선택</div>
                <button onClick={()=>setShowCityPicker(false)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#888'}}>✕</button>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:16}}>
                <input value={customCity} onChange={e=>setCustomCity(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCustomCity()}
                  placeholder="직접 입력 (프라하, 리스본, 시드니...)"
                  style={{flex:1,border:'1px solid #ddd',borderRadius:10,padding:'10px 14px',fontSize:14}}/>
                <button onClick={addCustomCity} style={{background:'#111',color:'white',border:'none',borderRadius:10,padding:'10px 16px',fontSize:14,cursor:'pointer'}}>선택</button>
              </div>
              <div style={{fontSize:11,color:'#aaa',marginBottom:8,fontWeight:500}}>인기 도시</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {POPULAR_CITIES.map((c,i)=>(
                  <button key={i} onClick={()=>addCity(c)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',border:'1px solid #eee',borderRadius:12,background:'#fff',cursor:'pointer',textAlign:'left'}}>
                    <span style={{fontSize:22}}>{c.flag}</span>
                    <div><div style={{fontSize:13,fontWeight:500,color:'#111'}}>{c.name}</div><div style={{fontSize:11,color:'#888'}}>{c.country}</div></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: 결과 */}
        {step===3&&result&&(
          <>
            <div style={{display:'flex',borderBottom:'1px solid #f0f0f0',overflowX:'auto'}}>
              {[['plan','📅 일정'],['map','🗺️ 지도'],['food','🍽️ 식당'],['book','🎟️ 예약'],['tips','💡 TIP']].map(([id,label])=>(
                <button key={id} onClick={()=>setActiveTab(id)} style={{flex:1,padding:'12px 4px',fontSize:11,color:activeTab===id?'#111':'#aaa',border:'none',background:'none',cursor:'pointer',borderBottom:activeTab===id?'2px solid #111':'2px solid transparent',fontWeight:activeTab===id?600:400,whiteSpace:'nowrap',minWidth:60}}>{label}</button>
              ))}
            </div>

            <div style={{padding:16}}>

              {activeTab==='plan'&&result.days.map((day,i)=>(
                <div key={i} style={card}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <span style={{background:'#111',color:'white',fontSize:11,padding:'3px 9px',borderRadius:20}}>Day {day.day}</span>
                    <span style={{fontSize:14}}>{day.flag}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'#111'}}>{day.theme}</div>
                      <div style={{fontSize:11,color:'#aaa'}}>{day.city} · 🏨 {day.hotel}</div>
                    </div>
                  </div>
                  {day.slots.map((slot,j)=>(
                    <div key={j} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:j<day.slots.length-1?'1px solid #f5f5f5':'none'}}>
                      <div style={{fontSize:11,color:'#bbb',minWidth:38,paddingTop:2}}>{slot.time}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:500,color:'#111'}}>{slot.name}</div>
                        <div style={{fontSize:12,color:'#777',marginTop:1}}>{slot.desc}</div>
                        {slot.budget&&<div style={{fontSize:11,color:'#00897B',marginTop:2}}>💰 {slot.budget}</div>}
                        {slot.airportTip&&<div style={{fontSize:11,color:'#E65100',marginTop:2,background:'#FFF3E0',padding:'4px 8px',borderRadius:6}}>✈️ {slot.airportTip}</div>}
                        <div>
                          {slot.klook&&<a href={`https://www.klook.com/en-US/search/?query=${slot.klook}`} target="_blank" style={chip('#FF6B35')}>Klook</a>}
                          {slot.maps&&<a href={`https://www.google.com/maps/search/${slot.maps}`} target="_blank" style={chip('#4285F4')}>지도</a>}
                          {slot.transport&&<a href="https://www.grab.com" target="_blank" style={chip('#00B14F')}>Grab</a>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {activeTab==='map'&&cities.map((city,i)=>(
                <div key={i} style={{marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:8}}>{city.flag} {city.name}</div>
                  <div style={{borderRadius:14,overflow:'hidden',border:'1px solid #efefef'}}>
                    <iframe src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=${city.hotels[0]?.name?city.hotels[0].name+' '+city.name:city.name}&zoom=13`}
                      width="100%" height="200" style={{border:'none',display:'block'}} allowFullScreen loading="lazy"/>
                  </div>
                  <a href={`https://www.google.com/maps/search/${city.name}`} target="_blank" style={{display:'block',textAlign:'center',marginTop:8,fontSize:12,color:'#4285F4',textDecoration:'none'}}>구글맵에서 크게 보기 →</a>
                </div>
              ))}

              {activeTab==='food'&&(!foodData?<Spinner/>:foodData.restaurants.map((r,i)=>(
                <div key={i} style={{display:'flex',gap:12,...card}}>
                  <div style={{width:54,height:54,borderRadius:10,background:'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>{r.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:500,color:'#111'}}>{r.name}</div>
                    <div style={{fontSize:12,color:'#F4A015'}}>{r.stars}</div>
                    <div style={{fontSize:12,color:'#888',marginTop:2}}>{r.meta}</div>
                    {r.budget&&<div style={{fontSize:11,color:'#00897B',marginTop:2}}>💰 {r.budget}</div>}
                    <div style={{marginTop:6}}>
                      <a href={`https://www.google.com/maps/search/${r.maps}`} target="_blank" style={chip('#4285F4')}>지도</a>
                      <a href={`https://www.klook.com/en-US/search/?query=${r.maps}+restaurant`} target="_blank" style={chip('#FF5722')}>리뷰</a>
                    </div>
                  </div>
                </div>
              )))}

              {activeTab==='book'&&(!activitiesData?<Spinner/>:(
                <>
                  <div style={card}>
                    <div style={{fontSize:14,fontWeight:600,color:'#111',marginBottom:12}}>🎟️ 추천 액티비티</div>
                    {activitiesData.activities.map((a,i)=>(
                      <div key={i} style={{paddingBottom:10,marginBottom:10,borderBottom:i<activitiesData.activities.length-1?'1px solid #f5f5f5':'none'}}>
                        <div style={{fontSize:13,fontWeight:500,color:'#111'}}>{a.emoji} {a.name}</div>
                        <div style={{fontSize:12,color:'#777',marginTop:2}}>{a.desc}</div>
                        {a.budget&&<div style={{fontSize:11,color:'#00897B',marginTop:2}}>💰 {a.budget} · ⏱️ {a.duration}</div>}
                        <div style={{marginTop:6}}><a href={`https://www.klook.com/en-US/search/?query=${a.klook}`} target="_blank" style={chip('#FF6B35')}>Klook 예약</a></div>
                      </div>
                    ))}
                  </div>
                  <div style={card}>
                    <div style={{fontSize:14,fontWeight:600,color:'#111',marginBottom:12}}>🚗 교통</div>
                    {[{name:'Grab',desc:'동남아 택시 앱',url:'https://www.grab.com',color:'#00B14F'},{name:'Uber',desc:'글로벌 택시 앱',url:'https://www.uber.com',color:'#000'},{name:'Google Maps',desc:'대중교통 경로',url:'https://www.google.com/maps',color:'#4285F4'}].map((t,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<2?'1px solid #f5f5f5':'none'}}>
                        <div><div style={{fontSize:13,fontWeight:500,color:'#111'}}>{t.name}</div><div style={{fontSize:12,color:'#888'}}>{t.desc}</div></div>
                        <a href={t.url} target="_blank" style={{...chip(t.color),marginTop:0}}>열기</a>
                      </div>
                    ))}
                  </div>
                </>
              ))}

              {activeTab==='tips'&&(!tipsData?<Spinner/>:tipsData.countries.map((c,i)=>(
                <div key={i} style={{marginBottom:16}}>
                  <div style={{fontSize:16,fontWeight:700,color:'#111',marginBottom:10}}>{c.flag} {c.name} 여행 필수 정보</div>
                  <div style={card}>
                    <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:10}}>💳 결제 & 카드</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                      {[['VISA',c.payment?.visa],['Master',c.payment?.master],['Amex',c.payment?.amex]].map(([name,ok])=>(
                        <span key={name} style={{fontSize:12,padding:'4px 10px',borderRadius:20,background:ok?'#E8F5E9':'#FFEBEE',color:ok?'#2E7D32':'#C62828',fontWeight:500}}>{ok?'✓':'✗'} {name}</span>
                      ))}
                      <span style={{fontSize:12,padding:'4px 10px',borderRadius:20,background:'#FFF3E0',color:'#E65100',fontWeight:500}}>💵 현금 {c.payment?.cash}</span>
                    </div>
                    <div style={{fontSize:12,color:'#555',lineHeight:1.6}}>
                      {c.payment?.cashTip&&<div>• {c.payment.cashTip}</div>}
                      {c.payment?.exchangeTip&&<div>• {c.payment.exchangeTip}</div>}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:8}}>📶 유심 / eSIM</div>
                    <div style={{fontSize:12,color:'#555',lineHeight:1.6}}>
                      <div>• 추천: <strong>{c.sim?.recommend}</strong> · {c.sim?.price}</div>
                      {c.sim?.tip&&<div>• {c.sim.tip}</div>}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:8}}>🚗 교통</div>
                    <div style={{fontSize:12,color:'#555',lineHeight:1.6}}>
                      {c.transport?.app&&<div>• 추천 앱: <strong>{c.transport.app}</strong></div>}
                      {c.transport?.card&&<div>• 교통카드: {c.transport.card}</div>}
                      {c.transport?.tip&&<div>• {c.transport.tip}</div>}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:8}}>🤝 문화 & 주의사항</div>
                    <div style={{fontSize:12,color:'#555',lineHeight:1.6}}>
                      {c.culture?.tip&&<div>• 팁 문화: {c.culture.tip}</div>}
                      {c.culture?.caution&&<div>• ⚠️ {c.culture.caution}</div>}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:8}}>🛂 비자 정보</div>
                    <div style={{fontSize:12,color:'#555',lineHeight:1.6}}>
                      <div>• 한국인: {c.visa?.korean}</div>
                      {c.visa?.duration&&<div>• 무비자 체류: {c.visa.duration}</div>}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:8}}>🚨 긴급 연락처</div>
                    <div style={{fontSize:12,color:'#555',lineHeight:1.6}}>
                      {c.emergency?.police&&<div>• 경찰: <strong>{c.emergency.police}</strong></div>}
                      {c.emergency?.ambulance&&<div>• 구급: <strong>{c.emergency.ambulance}</strong></div>}
                      {c.emergency?.embassy&&<div>• 한국 대사관: <strong>{c.emergency.embassy}</strong></div>}
                    </div>
                  </div>
                  {c.phrases&&c.phrases.length>0&&(
                    <div style={card}>
                      <div style={{fontSize:13,fontWeight:600,color:'#111',marginBottom:8}}>🗣️ 기본 회화</div>
                      {c.phrases.map((p,j)=>(
                        <div key={j} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:j<c.phrases.length-1?'1px solid #f5f5f5':'none',fontSize:12}}>
                          <span style={{color:'#888'}}>{p.korean}</span>
                          <div style={{textAlign:'right'}}>
                            <div style={{color:'#111',fontWeight:500}}>{p.local}</div>
                            <div style={{color:'#aaa',fontSize:11}}>{p.pronunciation}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )))}
            </div>
          </>
        )}

        {loading&&(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
            <div style={{width:48,height:48,border:'3px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
            <div style={{color:'white',fontSize:15,fontWeight:500}}>AI가 최적 동선으로 일정 생성 중...</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:12}}>항공편 + 숙소 위치 기반으로 계산 중</div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
