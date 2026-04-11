const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY')
  if (!TMDB_API_KEY) {
    return new Response(JSON.stringify({ error: 'TMDB_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'movies' // movies or sports

    if (type === 'movies') {
      const headers = { 'Authorization': `Bearer ${TMDB_API_KEY}`, 'Accept': 'application/json' }
      const [nowPlayingRes, upcomingRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1`, { headers }),
        fetch(`https://api.themoviedb.org/3/movie/upcoming?language=en-US&page=1`, { headers }),
      ])

      const [nowPlaying, upcoming] = await Promise.all([nowPlayingRes.json(), upcomingRes.json()])
      
      console.log('TMDB now_playing status:', nowPlayingRes.status, 'results count:', (nowPlaying.results || []).length)
      console.log('TMDB upcoming status:', upcomingRes.status, 'results count:', (upcoming.results || []).length)
      if (nowPlaying.status_message) console.log('TMDB error:', nowPlaying.status_message)

      const allMovies = [...(nowPlaying.results || []), ...(upcoming.results || [])]
      const uniqueMovies = allMovies.filter((m: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === m.id) === i)

      const movies = uniqueMovies.slice(0, 20).map((m: any) => ({
        tmdb_id: m.id,
        title: m.title,
        description: m.overview,
        image_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
        backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
        date: m.release_date,
        rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : 0,
        category: 'movies',
      }))

      return new Response(JSON.stringify({ movies }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For sports, we return curated upcoming sports events data
    // (No free reliable sports API exists, so we provide structured data)
    const sportsEvents = [
      { title: 'IPL 2026: MI vs RCB', description: 'Mumbai Indians vs Royal Challengers Bangalore - the clash of titans in IPL 2026.', date: '2026-04-15', venue: 'Wankhede Stadium', city: 'Mumbai', price: 800, category: 'sports', image_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&h=400&fit=crop', rating: 4.8 },
      { title: 'IPL 2026: CSK vs KKR', description: 'Chennai Super Kings vs Kolkata Knight Riders - electrifying T20 cricket.', date: '2026-04-18', venue: 'MA Chidambaram Stadium', city: 'Chennai', price: 700, category: 'sports', image_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&h=400&fit=crop', rating: 4.7 },
      { title: 'IPL 2026: DC vs SRH', description: 'Delhi Capitals take on Sunrisers Hyderabad in a must-win encounter.', date: '2026-04-20', venue: 'Arun Jaitley Stadium', city: 'Delhi', price: 600, category: 'sports', image_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&h=400&fit=crop', rating: 4.5 },
      { title: 'India vs Australia - 1st Test', description: 'Border-Gavaskar Trophy 2026. India hosts Australia for an epic test series.', date: '2026-05-10', venue: 'M. Chinnaswamy Stadium', city: 'Bangalore', price: 1200, category: 'sports', image_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&h=400&fit=crop', rating: 4.9 },
      { title: 'ISL 2026: Mumbai City FC vs Bengaluru FC', description: 'Indian Super League football action at its finest.', date: '2026-04-22', venue: 'Mumbai Football Arena', city: 'Mumbai', price: 500, category: 'sports', image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop', rating: 4.3 },
      { title: 'Pro Kabaddi League Final', description: 'The grand finale of PKL Season 12. Two top teams battle for glory.', date: '2026-05-05', venue: 'Gachibowli Indoor Stadium', city: 'Hyderabad', price: 400, category: 'sports', image_url: 'https://images.unsplash.com/photo-1461896836934-bd45ba8cca92?w=600&h=400&fit=crop', rating: 4.4 },
      { title: 'India vs England - T20I', description: 'High-octane T20 International cricket between India and England.', date: '2026-05-15', venue: 'Eden Gardens', city: 'Kolkata', price: 900, category: 'sports', image_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&h=400&fit=crop', rating: 4.8 },
      { title: 'Indian Grand Prix - F1', description: 'Formula 1 returns to India! Watch the fastest cars in the world race on Indian soil.', date: '2026-06-01', venue: 'Buddh International Circuit', city: 'Delhi', price: 5000, category: 'sports', image_url: 'https://images.unsplash.com/photo-1541889413-d0da3f6acf00?w=600&h=400&fit=crop', rating: 4.9 },
    ]

    return new Response(JSON.stringify({ sports: sportsEvents }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
