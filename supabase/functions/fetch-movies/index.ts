const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Free public APIs - NO API KEY REQUIRED:
// - Movies: iTunes RSS Top Movies feed (Apple, no key, no rate limit issues)
// - Sports: TheSportsDB free public tier (key "3" is the free demo tier, no signup)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'movies'

    if (type === 'movies') {
      // iTunes Top Movies RSS - free, no key, latest theatrical & digital releases
      const itunesRes = await fetch(
        'https://itunes.apple.com/us/rss/topmovies/limit=25/json'
      )
      const itunesData = await itunesRes.json()
      const entries = itunesData?.feed?.entry || []
      console.log('iTunes top movies fetched:', entries.length)

      const movies = entries.slice(0, 20).map((m: any) => {
        const title = m['im:name']?.label || 'Untitled'
        // Get the largest available image (170x170) and upscale URL to 600x900
        const imgs = m['im:image'] || []
        const lastImg = imgs[imgs.length - 1]?.label || ''
        const hiRes = lastImg.replace(/\/\d+x\d+bb\./, '/600x900bb.')
        const releaseDate = m['im:releaseDate']?.label || new Date().toISOString()
        const genre = m.category?.attributes?.label || 'Movie'
        const description = m.summary?.label || `${title} - now showing in theaters.`

        return {
          tmdb_id: parseInt(m.id?.attributes?.['im:id'] || '0'),
          title,
          description: description.substring(0, 500),
          image_url: hiRes,
          backdrop_url: hiRes,
          date: releaseDate.split('T')[0],
          rating: 4.0 + Math.random() * 0.9,
          category: 'movies',
          genre,
        }
      })

      return new Response(JSON.stringify({ movies }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (type === 'sports') {
      // TheSportsDB - free demo key "3", real upcoming sports events
      const leagues = [
        { id: '4328', name: 'English Premier League' },
        { id: '4480', name: 'NBA' },
        { id: '4391', name: 'NFL' },
        { id: '4424', name: 'MLB' },
        { id: '4344', name: 'Spanish La Liga' },
        { id: '4332', name: 'Italian Serie A' },
      ]

      const allEvents: any[] = []
      const seenIds = new Set<string>()

      const results = await Promise.all(
        leagues.map(async (league) => {
          try {
            const res = await fetch(
              `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.id}`
            )
            const data = await res.json()
            return { league, events: data.events || [] }
          } catch {
            return { league, events: [] }
          }
        })
      )

      for (const { league, events } of results) {
        console.log(`${league.name}: ${events.length} events`)
        for (const ev of events.slice(0, 4)) {
          if (!ev.idEvent || seenIds.has(ev.idEvent)) continue
          seenIds.add(ev.idEvent)
          allEvents.push({
            title: ev.strEvent || `${ev.strHomeTeam} vs ${ev.strAwayTeam}`,
            description: `${league.name} - ${ev.strHomeTeam} vs ${ev.strAwayTeam}. Catch the live action!`,
            date: ev.dateEvent || new Date().toISOString().split('T')[0],
            time: (ev.strTime || '19:00:00').substring(0, 5),
            venue: ev.strVenue || 'Stadium',
            city: ev.strCity || ev.strCountry || 'TBD',
            price: Math.floor(Math.random() * 1500) + 500,
            category: 'sports',
            image_url: ev.strThumb || ev.strBanner || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop',
            rating: Math.round((4.3 + Math.random() * 0.6) * 10) / 10,
          })
        }
      }

      // Curated Indian sports events (no public API for IPL/ISL)
      const indianSports = [
        { title: 'IPL 2026: MI vs RCB', description: 'Mumbai Indians vs Royal Challengers Bangalore - clash of titans.', date: '2026-04-25', time: '19:30', venue: 'Wankhede Stadium', city: 'Mumbai', price: 800, category: 'sports', image_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&h=400&fit=crop', rating: 4.8 },
        { title: 'IPL 2026: CSK vs KKR', description: 'Chennai Super Kings vs Kolkata Knight Riders.', date: '2026-04-28', time: '19:30', venue: 'MA Chidambaram Stadium', city: 'Chennai', price: 700, category: 'sports', image_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&h=400&fit=crop', rating: 4.7 },
        { title: 'India vs Australia - 1st Test', description: 'Border-Gavaskar Trophy 2026 epic test series.', date: '2026-05-10', time: '09:30', venue: 'M. Chinnaswamy Stadium', city: 'Bangalore', price: 1200, category: 'sports', image_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&h=400&fit=crop', rating: 4.9 },
        { title: 'ISL 2026 Final', description: 'Indian Super League grand finale.', date: '2026-05-15', time: '20:00', venue: 'Salt Lake Stadium', city: 'Kolkata', price: 600, category: 'sports', image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop', rating: 4.6 },
      ]

      const sportsEvents = [...allEvents, ...indianSports]
      console.log('Total sports events:', sportsEvents.length)

      return new Response(JSON.stringify({ sports: sportsEvents }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Function error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
