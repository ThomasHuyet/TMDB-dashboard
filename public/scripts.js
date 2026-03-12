async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Erreur fetch:", url, res.status);
    throw new Error("Fetch error " + res.status);
  }
  return res.json();
}

function formatNumber(n) {
  if (n == null) return "-";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " Md";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " k";
  return n.toString();
}

function debounce(fn, delay = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  const body = document.body;
  if (!btn) return;

  const saved = localStorage.getItem("theme") || "dark";

  function applyTheme(theme) {
    if (theme === "light") {
      body.classList.remove("theme-dark");
      btn.textContent = "⭐ Mode Star Wars";
    } else {
      body.classList.add("theme-dark");
      btn.textContent = "🌙 Mode sombre";
    }
  }

  applyTheme(saved);

  btn.addEventListener("click", () => {
    const isDark = body.classList.toggle("theme-dark");
    const theme = isDark ? "dark" : "light";
    localStorage.setItem("theme", theme);
    applyTheme(theme);
  });
}

function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");

      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      contents.forEach((c) =>
        c.classList.toggle("active", c.id === `tab-${tab}`)
      );

      setTimeout(() => {
        if (tab === "overview") {
          renderBudgetRevenueChart();
          renderTopActorsChart();
          renderKeywordsChart();
        }
        if (tab === "stats") {
          renderGenrePopularityCharts();
          renderUpcomingPopularityDonut();
        }
        if (tab === "history") {
          renderHistoryTrendingCount();
          renderHistoryGenresAvg();
        }
      }, 50);
    });
  });
}

function initSocketAndRealtime() {
  if (typeof io === "undefined") return;
  const socket = io();
  const statusEl = document.getElementById("realtime-status");

  socket.on("connect", () => {
    if (statusEl) statusEl.textContent = "Temps réel : connecté";
  });

  socket.on("disconnect", () => {
    if (statusEl) statusEl.textContent = "Temps réel : déconnecté";
  });

  socket.on("dataUpdated", () => {
    console.log("🟢 dataUpdated reçu");
    loadKPIs();
    applyMovieFilters();
    loadAllCharts();
  });
}

async function loadKPIs() {
  const container = document.getElementById("kpi-container");
  if (!container) return;
  container.innerHTML = "";

  try {
    const [popular, upcoming, topActors, genrePop] = await Promise.all([
      fetchJSON("/api/movies/popular?limit=200"),
      fetchJSON("/api/movies/upcoming"),
      fetchJSON("/api/stats/top-actors"),
      fetchJSON("/api/stats/genre-popularity"),
    ]);

    const kpis = [];

    kpis.push({
      label: "Films populaires",
      value: popular.length,
      sub: "Films",
    });

    kpis.push({
      label: "Films à venir",
      value: upcoming.length,
      sub: "Films",
    });

    const topActor = topActors[0];
    kpis.push({
      label: "Acteur le plus présent",
      value: topActor ? topActor.name : "N/A",
      sub: topActor ? `${topActor.appearances} apparitions` : "",
    });

    const topGenre = genrePop[0];
    kpis.push({
      label: "Genre le plus populaire",
      value: topGenre ? topGenre.name : "N/A",
      sub: topGenre
        ? `Popularité moyenne ${topGenre.avgPopularity.toFixed(1)}`
        : "",
    });

    kpis.forEach((k) => {
      const div = document.createElement("div");
      div.className = "kpi-card";
      div.innerHTML = `
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-sub">${k.sub}</div>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Erreur KPIs:", err);
    container.textContent = "Erreur lors du chargement des indicateurs.";
  }
}

let _allPopularMovies = null;

async function loadGenresFilter() {
  const select = document.getElementById("genre-filter");
  if (!select) return;

  try {
    const genres = await fetchJSON("/api/genres");
    genres.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Erreur chargement genres:", err);
  }
}

async function ensurePopularMoviesLoaded() {
  if (_allPopularMovies) return _allPopularMovies;
  _allPopularMovies = await fetchJSON("/api/movies/popular?limit=500");
  return _allPopularMovies;
}

async function applyMovieFilters() {
  const resultsContainer = document.getElementById("movie-results");
  if (!resultsContainer) return;

  resultsContainer.innerHTML = "Chargement...";

  try {
    const movies = await ensurePopularMoviesLoaded();

    const query = document
      .getElementById("search-input")
      .value.trim()
      .toLowerCase();
    const genreId = document.getElementById("genre-filter").value;
    const yearStr = document.getElementById("year-filter").value.trim();
    const popMinStr = document
      .getElementById("popularity-filter")
      .value.trim();

    const year = yearStr ? Number(yearStr) : null;
    const popMin = popMinStr ? Number(popMinStr) : null;

    const filtered = movies.filter((m) => {
      if (query && !m.title.toLowerCase().includes(query)) return false;

      if (genreId) {
        const gId = Number(genreId);
        if (!Array.isArray(m.genres) || !m.genres.includes(gId)) return false;
      }

      if (year) {
        const date = m.releaseDate ? new Date(m.releaseDate) : null;
        const y = date ? date.getFullYear() : null;
        if (y !== year) return false;
      }

      if (popMin != null && typeof m.popularity === "number") {
        if (m.popularity < popMin) return false;
      }

      return true;
    });

    const noFilter =
      !query && !genreId && !year && (popMinStr === "" || popMinStr == null);
    const toDisplay = noFilter ? filtered.slice(0, 20) : filtered;

    resultsContainer.innerHTML = "";
    if (!toDisplay.length) {
      resultsContainer.textContent = "Aucun film ne correspond à ces filtres.";
      return;
    }

    toDisplay.forEach((m) => {
      const div = document.createElement("div");
      div.className = "movie-card";

      const date = m.releaseDate ? new Date(m.releaseDate) : null;
      const yearText = date ? date.getFullYear() : "N/A";

      let genresText = "-";
      if (Array.isArray(m.genres)) {
        genresText = m.genres.join(", ");
      }

      div.innerHTML = `
        <div class="movie-title">${m.title}</div>
        <div class="movie-meta">
          <span>Année : ${yearText}</span>
          <span>Genres (ids) : ${genresText}</span>
        </div>
        <div class="movie-popularity">
          Popularité : ${
            m.popularity?.toFixed ? m.popularity.toFixed(1) : m.popularity
          }
        </div>
      `;

      resultsContainer.appendChild(div);
    });
  } catch (err) {
    console.error("Erreur filtres films:", err);
    resultsContainer.textContent = "Erreur lors du chargement des films.";
  }
}

function initMovieFilters() {
  const btn = document.getElementById("apply-filters");
  const searchInput = document.getElementById("search-input");

  if (btn) btn.addEventListener("click", applyMovieFilters);
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyMovieFilters();
    });
  }
}

let tooltip;

function initTooltip() {
  tooltip = d3.select("body").append("div").attr("class", "tooltip");
}

async function renderBudgetRevenueChart() {
  const container = d3.select("#chart-budget-revenue");
  if (container.empty()) return;
  container.selectAll("*").remove();

  const rawData = await fetchJSON("/api/stats/budget-revenue");
  const data = rawData.filter(
    (d) => d.budget > 0 && d.revenue > 0 && d.popularity != null
  );
  if (!data.length) return;

  const rect = container.node().getBoundingClientRect();
  const width = rect.width || 640;
  const height = rect.height || 360;
  const margin = { top: 20, right: 30, bottom: 55, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg").attr("width", width).attr("height", height);
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleLog()
    .domain(d3.extent(data, (d) => d.budget))
    .nice()
    .range([0, innerWidth]);

  const y = d3
    .scaleLog()
    .domain(d3.extent(data, (d) => d.revenue))
    .nice()
    .range([innerHeight, 0]);

  const popExtent = d3.extent(data, (d) => d.popularity || 1);
  const size = d3.scaleSqrt().domain(popExtent).range([4, 18]);
  const color = d3
    .scaleSequential(d3.interpolateCool)
    .domain([popExtent[0] || 0, popExtent[1] || 1]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(6, "~s"));

  g.append("g").call(d3.axisLeft(y).ticks(6, "~s"));

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text("Budget (échelle logarithmique)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -55)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text("Recettes (échelle logarithmique)");

  const circles = g
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", (d) => x(d.budget))
    .attr("cy", (d) => y(d.revenue))
    .attr("r", 0)
    .attr("fill", (d) => color(d.popularity))
    .attr("stroke", "rgba(15,23,42,0.7)")
    .attr("fill-opacity", 0.9);

  circles
    .transition()
    .duration(800)
    .attr("r", (d) => size(d.popularity));

  circles
    .on("mouseenter", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.title}</strong><br/>
           Budget : ${formatNumber(d.budget)}<br/>
           Recettes : ${formatNumber(d.revenue)}<br/>
           Popularité TMDB : ${d.popularity.toFixed(1)}`
        )
        .style("left", event.pageX + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", (event) => {
      tooltip.style("left", event.pageX + "px").style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));
}

async function renderTopActorsChart() {
  const container = d3.select("#chart-top-actors");
  if (container.empty()) return;
  container.selectAll("*").remove();

  const data = await fetchJSON("/api/stats/top-actors");
  if (!data.length) return;

  const rect = container.node().getBoundingClientRect();

  let width = rect.width;
  let height = rect.height;

  if (width < 50) width = 640;
  if (height < 50) height = 420;

  const margin = { top: 20, right: 30, bottom: 30, left: 160 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand()
    .domain(data.map(d => d.name))
    .range([0, innerHeight])
    .padding(0.2);

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.appearances) || 1])
    .nice()
    .range([0, innerWidth]);

  const color = d3.scaleSequential(d3.interpolatePlasma)
    .domain([0, data.length]);

   g.append("g").call(d3.axisLeft(y));
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5));

  const bars = g.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", 0)
    .attr("y", d => y(d.name))
    .attr("height", y.bandwidth())
    .attr("width", 0)
    .attr("fill", (d, i) => color(i));

  bars.transition()
    .duration(800)
    .attr("width", d => x(d.appearances));

  bars
    .on("mouseenter", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.name}</strong><br/>Nombre de films : ${d.appearances}`
        )
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));
}

async function renderKeywordsChart() {
  const container = d3.select("#chart-keywords");
  if (container.empty()) return;
  container.selectAll("*").remove();

  const raw = await fetchJSON("/api/stats/keywords");
  if (!raw.length) return;

  const data = raw
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 30);

  const rect = container.node().getBoundingClientRect();
  const width = rect.width || 640;
  const height = rect.height || 340;
  const margin = { top: 10, right: 10, bottom: 10, left: 10 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const sizeScale = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.occurrences))
    .range([14, 40]);

  const color = d3
    .scaleSequential(d3.interpolateTurbo)
    .domain([0, data.length]);

  const words = data.map((d, i) => ({
    text: d.name,
    value: d.occurrences,
    colorIndex: i,
  }));

  if (!d3.layout || !d3.layout.cloud) {
    container
      .append("div")
      .text("Word cloud indisponible (d3-cloud non chargé)");
    return;
  }

  d3.layout
    .cloud()
    .size([innerWidth, innerHeight])
    .words(words)
    .padding(4)
    .rotate(() => 0)
    .font("system-ui")
    .fontSize((d) => sizeScale(d.value))
    .on("end", (cloudWords) => {
      const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      const g = svg
        .append("g")
        .attr(
          "transform",
          `translate(${margin.left + innerWidth / 2},${
            margin.top + innerHeight / 2
          })`
        );

      g.selectAll("text")
        .data(cloudWords)
        .join("text")
        .style("font-family", "system-ui, sans-serif")
        .style("font-size", (d) => `${d.size}px`)
        .style("fill", (d) => color(d.colorIndex))
        .attr("text-anchor", "middle")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .text((d) => d.text)
        .on("mouseenter", (event, d) => {
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>${d.text}</strong><br/>Nombre d'occurrences : ${d.value}`
            )
            .style("left", event.pageX + "px")
            .style("top", event.pageY - 10 + "px");
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", event.pageX + "px")
            .style("top", event.pageY - 10 + "px");
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));
    })
    .start();
}

async function renderGenrePopularityCharts() {
  const data = await fetchJSON("/api/stats/genre-popularity");
  if (!data.length) return;

  drawGenrePopularityBar("#chart-genre-popularity", data);
  drawGenrePopularityDonut("#chart-genre-popularity-2", data);
}

function drawGenrePopularityBar(selector, data) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.selectAll("*").remove();

  const rect = container.node().getBoundingClientRect();
  const width = rect.width || 640;
  const height = rect.height || 360;
  const margin = { top: 20, right: 20, bottom: 80, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg").attr("width", width).attr("height", height);
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.name))
    .range([0, innerWidth])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.avgPopularity) || 1])
    .nice()
    .range([innerHeight, 0]);

  const color = d3
    .scaleSequential(d3.interpolateViridis)
    .domain([0, data.length]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end")
    .attr("font-size", 10);

  g.append("g").call(d3.axisLeft(y).ticks(5));

  const bars = g
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => x(d.name))
    .attr("width", x.bandwidth())
    .attr("y", innerHeight)
    .attr("height", 0)
    .attr("fill", (d, i) => color(i));

  bars
    .transition()
    .duration(800)
    .attr("y", (d) => y(d.avgPopularity))
    .attr("height", (d) => innerHeight - y(d.avgPopularity));

  bars
    .on("mouseenter", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.name}</strong><br/>Popularité moyenne : ${d.avgPopularity.toFixed(
            2
          )}`
        )
        .style("left", event.pageX + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", (event) => {
      tooltip.style("left", event.pageX + "px").style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));
}

function drawGenrePopularityDonut(selector, data) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.selectAll("*").remove();

  const sorted = [...data].sort((a, b) => b.avgPopularity - a.avgPopularity);
  const top = sorted.slice(0, 12);

  const rect = container.node().getBoundingClientRect();
  const width = rect.width || 640;
  const height = rect.height || 360;
  const radius = Math.min(width, height) / 2 - 20;

  const svg = container.append("svg").attr("width", width).attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const total = top.reduce((acc, d) => acc + (d.avgPopularity || 0), 0) || 1;

  const pie = d3
    .pie()
    .sort(null)
    .value((d) => d.avgPopularity || 0);

  const arcs = pie(top);

  const arc = d3
    .arc()
    .innerRadius(radius * 0.55)
    .outerRadius(radius);

  const color = d3
    .scaleOrdinal(d3.schemeTableau10)
    .domain(top.map((d) => d.name));

  const path = g
    .selectAll("path")
    .data(arcs)
    .join("path")
    .attr("fill", (d) => color(d.data.name))
    .attr("d", arc)
    .each(function (d) {
      this._current = d;
    });

  path
    .transition()
    .duration(900)
    .attrTween("d", function (d) {
      const i = d3.interpolate(
        { startAngle: d.startAngle, endAngle: d.startAngle },
        d
      );
      return function (t) {
        return arc(i(t));
      };
    });

  path
    .on("mouseenter", (event, d) => {
      const part = ((d.data.avgPopularity / total) * 100).toFixed(1);
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.data.name}</strong><br/>
           Part de popularité : ${part} %`
        )
        .style("left", event.pageX + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", (event) => {
      tooltip.style("left", event.pageX + "px").style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));

  const legend = svg
    .append("g")
    .attr("transform", `translate(16,16)`);

  top.forEach((d, i) => {
    const y = i * 18;
    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", y)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(d.name));

    legend
      .append("text")
      .attr("x", 18)
      .attr("y", y + 10)
      .attr("font-size", 11)
      .attr("fill", "#e5e7eb")
      .text(d.name);
  });

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("y", -4)
    .attr("font-size", 13)
    .attr("fill", "#e5e7eb")
    .text("Part de popularité");

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 14)
    .attr("font-size", 11)
    .attr("fill", "#9ca3af")
    .text("par genre (Top 12)");
}

async function renderUpcomingPopularityDonut() {
  const container = d3.select("#chart-upcoming-timeline");
  if (container.empty()) return;
  container.selectAll("*").remove();

  const data = await fetchJSON("/api/stats/upcoming/popularity");
  if (!data.length) return;

  const rect = container.node().getBoundingClientRect();
  const width = rect.width || 680;
  const height = rect.height || 420;
  const radius = Math.min(width, height) / 2 - 20;

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2 - 60},${height / 2})`);

  const pie = d3
    .pie()
    .sort(null)
    .value((d) => d.count);

  const arcs = pie(data);

  const arc = d3
    .arc()
    .innerRadius(radius * 0.55)
    .outerRadius(radius);

  const color = d3
    .scaleOrdinal(d3.schemeTableau10)
    .domain(data.map((d) => d.label));

  g.selectAll("path")
    .data(arcs)
    .join("path")
    .attr("fill", (d) => color(d.data.label))
    .attr("d", arc)
    .attr("stroke", "#0f172a")
    .attr("stroke-width", 2)
    .attr("fill-opacity", 0.9)
    .on("mouseenter", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.data.label}</strong><br/>
           ${d.data.count} films`
        )
        .style("left", event.pageX + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", (event) => {
      tooltip.style("left", event.pageX + "px").style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("y", -5)
    .attr("fill", "#e5e7eb")
    .attr("font-size", 17)
    .text("Popularité");

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 20)
    .attr("fill", "#9ca3af")
    .attr("font-size", 13)
    .text("films à venir");

  const legend = svg.append("g")
    .attr("transform", `translate(${width - 170}, 40)`);

  data.forEach((d, i) => {
    const y = i * 22;

    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", y)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", color(d.label));

    legend
      .append("text")
      .attr("x", 22)
      .attr("y", y + 12)
      .attr("font-size", 12)
      .attr("fill", "#e5e7eb")
      .text(`${d.label} (${d.count})`);
  });
}

function getHistoryControls() {
  const windowEl = document.getElementById("history-window");
  const daysEl = document.getElementById("history-days");
  const window = windowEl ? windowEl.value : "day";
  const days = daysEl ? Number(daysEl.value) || 30 : 30;
  return { window, days };
}

async function renderHistoryTrendingCount() {
  const container = d3.select("#chart-history-trending-count");
  if (container.empty()) return;
  container.selectAll("*").remove();

  const { window, days } = getHistoryControls();
  const data = await fetchJSON(
    `/api/history/trending/${window}/count?days=${days}`
  );

  if (!data.length) {
    container.append("div").text("Pas encore de données d'historique.");
    return;
  }

  const parsed = data.map((d) => ({
    date: new Date(d.date),
    count: d.count || 0,
  }));

  const rect = container.node().getBoundingClientRect();
  const width = rect.width || 640;
  const height = rect.height || 360;
  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg").attr("width", width).attr("height", height);
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleTime()
    .domain(d3.extent(parsed, (d) => d.date))
    .range([0, innerWidth]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(parsed, (d) => d.count) || 1])
    .nice()
    .range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(6)
        .tickFormat(d3.timeFormat("%d %b"))
    )
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .style("text-anchor", "end")
    .attr("font-size", 10);

  g.append("g").call(d3.axisLeft(y).ticks(5));

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 45)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text(`Date (derniers ${days} jours)`);

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text(`Nombre de films en tendance (${window})`);

  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.count))
    .curve(d3.curveMonotoneX);

  const path = g
    .append("path")
    .datum(parsed)
    .attr("fill", "none")
    .attr("stroke", "#38bdf8")
    .attr("stroke-width", 2)
    .attr("d", line);

  const totalLength = path.node().getTotalLength();
  path
    .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(800)
    .attr("stroke-dashoffset", 0);

  const dots = g
    .selectAll("circle")
    .data(parsed)
    .join("circle")
    .attr("cx", (d) => x(d.date))
    .attr("cy", (d) => y(d.count))
    .attr("r", 0)
    .attr("fill", "#38bdf8");

  dots
    .transition()
    .duration(800)
    .attr("r", 4);

  dots
    .on("mouseenter", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d3.timeFormat("%d %b")(d.date)}</strong><br/>
           Films en tendance : ${d.count}`
        )
        .style("left", event.pageX + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", (event) => {
      tooltip.style("left", event.pageX + "px").style("top", event.pageY - 10 + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));
}

async function renderHistoryGenresAvg() {
  const container = d3.select("#chart-history-genres-avg");
  if (container.empty()) return;
  container.selectAll("*").remove();

  const { days } = getHistoryControls();
  const raw = await fetchJSON(`/api/history/genres/avg-popularity?days=${days}`);

  if (!raw.length) {
    container.append("div").text("Pas encore de données d'historique.");
    return;
  }

  const entries = raw.map((e) => ({
    date: new Date(e.date),
    genres: e.byGenre || [],
  }));

  const genreMap = new Map();

  entries.forEach((e) => {
    e.genres.forEach((g) => {
      const id = g.genreId;
      if (!genreMap.has(id)) {
        genreMap.set(id, { genreId: id, name: g.name, values: [] });
      }
      genreMap.get(id).values.push({
        date: e.date,
        avgPopularity: g.avgPopularity ?? 0,
      });
    });
  });

  const genreList = Array.from(genreMap.values()).map((g) => {
    const mean =
      g.values.reduce((acc, v) => acc + (v.avgPopularity || 0), 0) /
      (g.values.length || 1);
    return { ...g, mean };
  });

  const topGenres = genreList.sort((a, b) => b.mean - a.mean).slice(0, 5);
  if (!topGenres.length) {
    container.append("div").text("Pas de genres suffisants pour le graphique.");
    return;
  }

  const allPoints = topGenres.flatMap((g) => g.values);
  const dateExtent = d3.extent(allPoints, (d) => d.date);
  const popExtent = d3.extent(allPoints, (d) => d.avgPopularity);

  const rect = container.node().getBoundingClientRect();
  const width = rect.width || 700;
  const height = rect.height || 380;
  const margin = { top: 20, right: 100, bottom: 60, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg").attr("width", width).attr("height", height);
  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime().domain(dateExtent).range([0, innerWidth]);
  const y = d3
    .scaleLinear()
    .domain([0, popExtent[1] || 1])
    .nice()
    .range([innerHeight, 0]);

  const color = d3
    .scaleOrdinal(d3.schemeTableau10)
    .domain(topGenres.map((g) => g.name));

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(6)
        .tickFormat(d3.timeFormat("%d %b"))
    )
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .style("text-anchor", "end")
    .attr("font-size", 10);

  g.append("g").call(d3.axisLeft(y).ticks(5));

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 45)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text(`Date (derniers ${days} jours)`);

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text("Popularité moyenne TMDB");

  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.avgPopularity))
    .curve(d3.curveMonotoneX);

  topGenres.forEach((genre) => {
    const path = g
      .append("path")
      .datum(genre.values)
      .attr("fill", "none")
      .attr("stroke", color(genre.name))
      .attr("stroke-width", 2)
      .attr("d", line);

    const totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(800)
      .attr("stroke-dashoffset", 0);

    const dots = g
      .selectAll(`.dot-${genre.genreId}`)
      .data(genre.values)
      .join("circle")
      .attr("class", `dot-${genre.genreId}`)
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(d.avgPopularity))
      .attr("r", 0)
      .attr("fill", color(genre.name));

    dots
      .transition()
      .duration(800)
      .attr("r", 3);

    dots
      .on("mouseenter", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${genre.name}</strong><br/>
             ${d3.timeFormat("%d %b")(d.date)}<br/>
             Popularité moyenne : ${d.avgPopularity.toFixed(2)}`
          )
          .style("left", event.pageX + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));
  });

  const legend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${width - margin.right + 10},${margin.top})`
    );

  topGenres.forEach((genre, i) => {
    const yOffset = i * 20;
    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", yOffset)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", color(genre.name));

    legend
      .append("text")
      .attr("x", 16)
      .attr("y", yOffset + 9)
      .attr("font-size", 10)
      .attr("fill", "#e5e7eb")
      .text(genre.name);
  });
}

async function loadAllCharts() {
  try {
    await Promise.all([
      renderBudgetRevenueChart(),
      renderTopActorsChart(),
      renderKeywordsChart(),
      renderGenrePopularityCharts(),
      renderUpcomingPopularityDonut(),
      renderHistoryTrendingCount(),
      renderHistoryGenresAvg(),
    ]);
  } catch (err) {
    console.error("Erreur loadAllCharts:", err);
  }
}

function initResizeRedraw() {
  const redraww = debounce(() => {
    loadAllCharts();
  }, 400);
  window.addEventListener("resize", redraww);
}

function initHistoryFilters() {
  const btn = document.getElementById("history-apply");
  if (btn) {
    btn.addEventListener("click", () => {
      renderHistoryTrendingCount();
      renderHistoryGenresAvg();
    });
  }

  const windowEl = document.getElementById("history-window");
  const daysEl = document.getElementById("history-days");
  [windowEl, daysEl].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", () => {
      renderHistoryTrendingCount();
      renderHistoryGenresAvg();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initThemeToggle();
  initTabs();
  initSocketAndRealtime();
  initTooltip();
  initMovieFilters();
  initResizeRedraw();
  initHistoryFilters();

  await loadGenresFilter();
  await loadKPIs();
  await applyMovieFilters();
  await loadAllCharts();
});
