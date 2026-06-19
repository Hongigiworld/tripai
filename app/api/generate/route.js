import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const body = await req.json()
    const { type, data } = body

    let prompt = ''

    if (type === 'itinerary') {
      const { cities, travelers, budget, days } = data
      const cityList = cities.map(c =>
        `${c.name}(${c.country}) ${c.days}일 - Day${c.startDay}~Day${c.endDay}, 숙소: ${c.hotel}, 이동수단: ${c.transport}, 시작시간: ${c.startTime}`
      ).join('\n')

      prompt = `다음 조건으로 여행 일정을 JSON으로만 만들어줘.

여행자: ${travelers}명
1인 하루 예산: ${budget}
루트:
${cityList}

각 Day마다 숙소 위치 기반으로 동선을 최적화하고, 예산에 맞는 식당/액티비티를 추천해줘.
도시간 이동일은 이동 시간을 반영해서 짧게 짜줘.

JSON 형식:
{
  "days": [
    {
      "day": 1,
      "city": "도시명",
      "country": "국가명",
      "flag": "🇹🇭",
      "hotel": "숙소명/지역",
      "theme": "오늘의 테마",
      "isTransitDay": false,
      "slots": [
        {
          "time": "09:00",
          "name": "장소명",
          "desc": "한줄설명",
          "type": "attraction|food|transport|hotel",
          "budget": "예상금액(1인)",
          "klook": "klook검색키워드 or null",
          "maps": "구글맵검색어",
          "transport": true
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
