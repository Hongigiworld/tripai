import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const body = await req.json()
    const { type, data } = body
    let prompt = ''

    if (type === 'itinerary') {
      const { cities, travelers, budget, flight } = data

      const cityList = cities.map(c => {
        const hotelInfo = (c.hotels && c.hotels.length > 0)
          ? c.hotels.map(h => `Day${h.checkin} 체크인: ${h.name||'미정'}`).join(', ')
          : '미정'
        return `${c.name}(${c.country||''}) ${c.days}일 - Day${c.startDay}~Day${c.endDay}, 숙소: [${hotelInfo}], 이동수단: ${c.transport||'대중교통'}, 시작시간: ${c.startTime||'종일'}`
      }).join('\n')

      let flightInfo = ''
      if (flight && flight.enabled) {
        const ob = flight.outbound
        const ib = flight.inbound
        flightInfo = `
항공편 정보:
- 가는 편: ${ob.fromAirport} ${ob.date} ${ob.time} 출발 → ${ob.toAirport} ${ob.arrivalDate} ${ob.arrivalTime} 도착
${ob.hasLayover ? `- 경유: ${ob.layoverAirport} ${ob.layoverHours}시간 대기` : ''}
- 오는 편: ${ib.fromAirport} ${ib.date} ${ib.time} 출발 → ${ib.toAirport} ${ib.arrivalDate} ${ib.arrivalTime} 도착

항공편 반영 규칙:
1. 도착 시간이 새벽(00:00~06:00)이면 첫 슬롯은 공항→호텔 이동만 넣고, 해당 도시 대중교통 새벽 운행 여부에 따라 택시/그랩 필요 여부와 예상 비용을 airportTip 필드에 명시
2. 도착 시간이 오후(15:00 이후)면 당일 관광은 1~2곳만
3. 경유가 있고 대기시간이 8시간 이상이면 경유지 시내 관광 옵션 제안
4. 귀국 출발 시간에 맞춰 마지막날 일정을 역산해서 짜고, 공항 이동 슬롯 반드시 포함
5. 이동수단에 따라 일정 밀도 조정: 도보 3곳, 대중교통 4곳, 택시/그랩 5~6곳, 렌트카 6곳 이상`
      } else {
        flightInfo = '이동수단에 따라 일정 밀도 조정: 도보 3곳, 대중교통 4곳, 택시/그랩 5~6곳, 렌트카 6곳 이상'
      }

      prompt = `다음 조건으로 여행 일정을 JSON으로만 만들어줘.

여행자: ${travelers}명
1인 하루 예산: ${budget}
루트:
${cityList}

${flightInfo}

각 Day마다 체크인 기준 숙소 위치 기반으로 동선을 최적화하고, 예산에 맞는 식당/액티비티를 추천해줘.
도시간 이동일은 이동 시간을 반영해서 짧게 짜줘.

JSON 형식:
{
  "days": [
    {
      "day": 1,
      "city": "도시명",
      "country": "국가명",
      "flag": "🇹🇭",
      "hotel": "오늘 숙소명/지역",
      "theme": "오늘의 테마",
      "isTransitDay": false,
      "slots": [
        {
          "time": "03:00",
          "name": "공항 → 호텔 이동",
          "desc": "한줄설명",
          "budget": "예상금액(1인)",
          "klook": null,
          "maps": "구글맵검색어",
          "transport": true,
          "airportTip": "새벽 도착 시 BTS 없음. 그랩 이용 필수 (약 350바트)"
        }
      ]
    }
  ]
}
JSON만 출력.`
    }

    if (type === 'food') {
      const { city, budget, travelers } = data
      prompt = `${city} 추천 맛집 4개를 JSON으로만. 1인 예산 ${budget}, ${travelers}명 기준.
형식: {"restaurants":[{"emoji":"🍜","name":"식당명","stars":"★★★★☆","meta":"음식종류 · 지역 · 가격대","tags":["태그1","태그2"],"maps":"구글맵검색어","budget":"1인 예상금액"}]}
JSON만.`
    }

    if (type === 'activities') {
      const { city, budget, travelers } = data
      prompt = `${city} 추천 액티비티 4개를 JSON으로만. 1인 예산 ${budget}, ${travelers}명 기준.
형식: {"activities":[{"emoji":"🛺","name":"액티비티명","desc":"한줄설명","budget":"1인 예상금액","klook":"klook검색키워드","duration":"소요시간"}]}
JSON만.`
    }

    if (type === 'tips') {
      const { countries } = data
      prompt = `다음 국가들의 여행 필수 정보를 JSON으로만: ${countries.join(', ')}
형식:
{"countries":[{"name":"국가명","flag":"🇹🇷","payment":{"visa":true,"master":true,"amex":false,"cash":"필수/권장/선택","cashTip":"현금 팁","exchangeTip":"환전 팁"},"sim":{"recommend":"추천 유심","price":"가격대","tip":"유심 팁"},"transport":{"app":"추천 교통 앱","tip":"교통 팁","card":"교통카드 정보"},"culture":{"tip":"팁 문화","caution":"주의사항"},"emergency":{"police":"경찰 번호","ambulance":"구급 번호","embassy":"한국 대사관 번호"},"visa":{"korean":"한국인 비자 조건","duration":"무비자 체류 기간"},"phrases":[{"korean":"감사합니다","local":"현지어","pronunciation":"발음"}]}]}
JSON만.`
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = message.content[0].text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(raw)
    return Response.json({ success: true, data: result })
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { status: 500 })
  }
}
