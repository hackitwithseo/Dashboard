const defaultShortcuts = [
  { name: 'YouTube', url: 'https://youtube.com' },
  { name: 'Twitch', url: 'https://twitch.tv' },
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'Reddit', url: 'https://reddit.com' },
  { name: 'ChatGPT', url: 'https://chatgpt.com' },
  { name: 'Discord', url: 'https://discord.com/app' }
];

const defaultStreamers = [];
const defaultYtCreators = [];

let temporaryBgData = null;
let animFrameId = null;
let currentTimeFormat = '24';
let currentStreamerPage = 1;
let streamerSortOrder = 'liveFirst'; // 'liveFirst' or 'default'
const STREAMERS_PER_PAGE = 7;

let cachedResolvedStreamers = [];
let isInitialStreamerLoad = true;

const mouse = { x: -1000, y: -1000 };

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

// Clock & Date Logic
function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  let timeStr = '';
  if (currentTimeFormat === '12') {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    timeStr = `${hoursStr}:${minutes}:${seconds} ${ampm}`;
  } else {
    const hoursStr = String(hours).padStart(2, '0');
    timeStr = `${hoursStr}:${minutes}:${seconds}`;
  }

  document.getElementById('time-display').textContent = timeStr;
  
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', options);
}
setInterval(updateClock, 1000);

// System Hardware Monitoring
function updateSystemStats() {
  if (chrome.system && chrome.system.memory) {
    chrome.system.memory.getInfo((info) => {
      const usedMem = info.capacity - info.availableCapacity;
      const usedGB = (usedMem / (1024 * 1024 * 1024)).toFixed(1);
      document.getElementById('ram-stat').textContent = `${usedGB}G`;
    });
  }
  if (chrome.system && chrome.system.cpu) {
    chrome.system.cpu.getInfo((info) => {
      const mockCpuPercent = (Math.random() * 8 + 8).toFixed(1);
      document.getElementById('cpu-stat').textContent = `${mockCpuPercent}%`;
    });
  }

  const isOnline = navigator.onLine;
  const netText = document.getElementById('net-status-text');
  const modalStatus = document.getElementById('modal-conn-status');
  if (isOnline) {
    netText.textContent = 'ONLINE';
    netText.style.color = '#34d399';
    modalStatus.textContent = 'Internet Connected';
    modalStatus.style.background = 'rgba(52, 211, 153, 0.15)';
    modalStatus.style.color = '#34d399';
  } else {
    netText.textContent = 'OFFLINE';
    netText.style.color = '#f87171';
    modalStatus.textContent = 'Internet Disconnected';
    modalStatus.style.background = 'rgba(248, 113, 113, 0.15)';
    modalStatus.style.color = '#f87171';
  }
}
setInterval(updateSystemStats, 3000);
updateSystemStats();

// Network Modal Triggers
const networkModal = document.getElementById('network-modal');
document.getElementById('open-network-popup').addEventListener('click', () => {
  networkModal.classList.remove('hidden');
});
document.getElementById('close-network').addEventListener('click', () => {
  networkModal.classList.add('hidden');
});
document.getElementById('reset-network-stats').addEventListener('click', () => {
  document.getElementById('sess-up').textContent = '0.0 MB';
  document.getElementById('sess-dl').textContent = '0.0 MB';
  document.getElementById('today-up').textContent = '0 MB';
  document.getElementById('today-dl').textContent = '0 MB';
  document.getElementById('total-up').textContent = '0 MB';
  document.getElementById('total-dl').textContent = '0 MB';
});

// Helper to extract YouTube video ID from URL
function getYouTubeVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// YOUTUBE CREATORS FEED FETCHING (HOVER TOOLTIP DEFAULT)
function loadYouTubeFeeds() {
  chrome.storage.sync.get(['ytCreators'], (result) => {
    let creators = result.ytCreators;
    if (!creators || !Array.isArray(creators) || creators.length === 0) {
      creators = defaultYtCreators;
    }

    const feedContainer = document.getElementById('video-feed');
    feedContainer.innerHTML = '';

    if (creators.length === 0) {
      feedContainer.innerHTML = `
        <div class="video-card">
          <i class="fa-brands fa-youtube video-icon"></i>
          <div class="video-info">
            <span class="video-title">No creators added yet. Add some in settings!</span>
          </div>
        </div>
      `;
      return;
    }

    creators.forEach((creator) => {
      const cleanId = String(creator.id || '').trim();
      const typeFilter = creator.type || 'both';
      if (!cleanId) return;

      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${cleanId}&t=${Date.now()}`;
      const apiFeedUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

      fetch(apiFeedUrl)
        .then(res => res.json())
        .then(data => {
          if (data && data.items && data.items.length > 0) {
            let selectedVideo = null;
            for (const item of data.items) {
              const isShort = item.link.includes('/shorts/') || item.title.toLowerCase().includes('#short');
              if (typeFilter === 'short' && isShort) {
                selectedVideo = item;
                break;
              } else if (typeFilter === 'video' && !isShort) {
                selectedVideo = item;
                break;
              } else if (typeFilter === 'both') {
                selectedVideo = item;
                break;
              }
            }

            if (!selectedVideo) return;

            const author = selectedVideo.author || 'Creator';
            const videoId = getYouTubeVideoId(selectedVideo.link);
            const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : (selectedVideo.thumbnail || '');

            const card = document.createElement('a');
            card.href = selectedVideo.link;
            card.target = '_blank';
            card.className = 'video-card';
            card.setAttribute('data-thumb', thumbUrl);

            card.innerHTML = `
              <i class="fa-brands fa-youtube video-icon"></i>
              <div class="video-info">
                <span class="video-title">${selectedVideo.title}</span>
                <span class="video-meta">${author} • Latest Upload</span>
              </div>
            `;

            const tooltip = document.getElementById('video-preview-tooltip');
            const previewImg = document.getElementById('preview-img');

            card.addEventListener('mouseenter', () => {
              if (thumbUrl) {
                previewImg.src = thumbUrl;
                tooltip.classList.remove('hidden');
              }
            });

            card.addEventListener('mousemove', (e) => {
              tooltip.style.left = `${e.clientX + 15}px`;
              tooltip.style.top = `${e.clientY - 130}px`;
            });

            card.addEventListener('mouseleave', () => {
              tooltip.classList.add('hidden');
            });

            feedContainer.appendChild(card);
          }
        })
        .catch(() => {});
    });
  });
}

setInterval(loadYouTubeFeeds, 5 * 60 * 1000);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    loadYouTubeFeeds();
    loadStreamers(true);
  }
});

// SHORTCUT REAL ICON GENERATOR
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch(e) {
    return null;
  }
}

function loadShortcuts() {
  chrome.storage.sync.get(['shortcuts'], (result) => {
    const shortcuts = result.shortcuts || defaultShortcuts;
    const grid = document.getElementById('shortcuts-grid');
    let htmlContent = '';
    
    shortcuts.forEach(s => {
      const iconUrl = getFaviconUrl(s.url);
      htmlContent += `
        <a href="${s.url}" class="shortcut-item">
          <img src="${iconUrl}" class="shortcut-icon-img" alt="${s.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
          <i class="fa-solid fa-globe" style="display:none;"></i>
          <span>${s.name}</span>
        </a>
      `;
    });
    grid.innerHTML = htmlContent;
  });
}

// REAL TWITCH LIVE STATUS & SILENT BACKGROUND REFRESH
async function checkTwitchChannelData(username) {
  if (!username) return { isLive: false, thumbUrl: '' };
  try {
    const response = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers: {
        'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko'
      },
      body: JSON.stringify({
        query: `query { user(login: "${username.toLowerCase().trim()}") { stream { id previewImageURL(width: 440, height: 248) } } }`
      })
    });
    const data = await response.json();
    const stream = data?.data?.user?.stream;
    if (stream) {
      return { isLive: true, thumbUrl: stream.previewImageURL };
    }
    return { isLive: false, thumbUrl: '' };
  } catch (err) {
    return { isLive: false, thumbUrl: '' };
  }
}

async function loadStreamers(isBackgroundRefresh = false) {
  chrome.storage.sync.get(['streamers', 'streamerSortOrder'], async (result) => {
    const streamers = result.streamers || defaultStreamers;
    if (result.streamerSortOrder) {
      streamerSortOrder = result.streamerSortOrder;
      document.getElementById('sort-status-label').textContent = streamerSortOrder === 'liveFirst' ? 'Live First' : 'Default Order';
    }

    const list = document.getElementById('streamers-list');
    const paginationContainer = document.getElementById('streamer-pagination');

    if (streamers.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 20px;">No streamers added yet.</div>`;
      paginationContainer.innerHTML = '';
      return;
    }

    if (isInitialStreamerLoad && !isBackgroundRefresh) {
      list.innerHTML = `<div style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 20px;">Checking status...</div>`;
      isInitialStreamerLoad = false;
    }

    const resolvedStreamers = [];
    for (const st of streamers) {
      let username = st.name;
      if (st.url) {
        try {
          const parsedUrl = new URL(st.url);
          const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
          if (pathSegments.length > 0) {
            username = pathSegments[0];
          }
        } catch (e) {}
      }
      const twitchData = await checkTwitchChannelData(username);
      resolvedStreamers.push({
        ...st,
        username,
        isLive: twitchData.isLive,
        thumbUrl: twitchData.thumbUrl
      });
    }

    cachedResolvedStreamers = resolvedStreamers;
    renderStreamersUI();
  });
}

function renderStreamersUI() {
  const list = document.getElementById('streamers-list');
  const paginationContainer = document.getElementById('streamer-pagination');
  list.innerHTML = '';
  paginationContainer.innerHTML = '';

  let sortedStreamers = [...cachedResolvedStreamers];
  if (streamerSortOrder === 'liveFirst') {
    sortedStreamers.sort((a, b) => (b.isLive === a.isLive) ? 0 : b.isLive ? 1 : -1);
  }

  const totalPages = Math.ceil(sortedStreamers.length / STREAMERS_PER_PAGE);
  if (currentStreamerPage > totalPages) currentStreamerPage = Math.max(1, totalPages);

  if (totalPages > 1) {
    for (let p = 1; p <= totalPages; p++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `page-num-btn `;
      if (p === currentStreamerPage) {
        pageBtn.classList.add('active');
      }
      pageBtn.textContent = p;
      pageBtn.addEventListener('click', () => {
        currentStreamerPage = p;
        renderStreamersUI();
      });
      paginationContainer.appendChild(pageBtn);
    }
  }

  const startIndex = (currentStreamerPage - 1) * STREAMERS_PER_PAGE;
  const pageStreamers = sortedStreamers.slice(startIndex, startIndex + STREAMERS_PER_PAGE);

  for (const st of pageStreamers) {
    const card = document.createElement('div');
    card.className = 'streamer-card';
    card.setAttribute('data-thumb', st.thumbUrl);
    card.innerHTML = `
      <span class="streamer-name">${st.name}</span>
      <span class="streamer-status ${st.isLive ? 'status-live' : 'status-offline'}">${st.isLive ? 'Live' : 'Offline'}</span>
    `;
    
    const tooltip = document.getElementById('video-preview-tooltip');
    const previewImg = document.getElementById('preview-img');

    card.addEventListener('mouseenter', () => {
      const currentThumb = card.getAttribute('data-thumb');
      if (currentThumb && st.isLive) {
        previewImg.src = currentThumb;
        tooltip.classList.remove('hidden');
      }
    });

    card.addEventListener('mousemove', (e) => {
      if (!tooltip.classList.contains('hidden')) {
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY - 130}px`;
      }
    });

    card.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden');
    });

    card.addEventListener('click', () => {
      if (st.isLive) {
        window.open(st.url || `https://www.twitch.tv/${st.username}`, '_blank');
      } else {
        showOfflinePixelModal(st.name);
      }
    });
    list.appendChild(card);
  }
}

// Streamer Sort Toggle Button Event
document.getElementById('sort-streamers-btn').addEventListener('click', () => {
  if (streamerSortOrder === 'liveFirst') {
    streamerSortOrder = 'default';
    document.getElementById('sort-status-label').textContent = 'Default Order';
  } else {
    streamerSortOrder = 'liveFirst';
    document.getElementById('sort-status-label').textContent = 'Live First';
  }
  chrome.storage.sync.set({ streamerSortOrder });
  renderStreamersUI();
});

// Background silent refresh every 3 minutes
setInterval(() => {
  loadStreamers(true);
}, 3 * 60 * 1000);

function showOfflinePixelModal(name) {
  document.getElementById('pixel-streamer-question').textContent = `IS ${name.toUpperCase()} LIVE RIGHT NOW?`;
  document.getElementById('offline-modal').classList.remove('hidden');
}

document.getElementById('close-offline').addEventListener('click', () => {
  document.getElementById('offline-modal').classList.add('hidden');
});

// CANVAS ANIMATIONS SETUP
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function stopAnimation() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getThemeColor() {
  const currentTheme = document.body.getAttribute('data-theme');
  if (currentTheme === 'emerald') return '16, 185, 129';
  if (currentTheme === 'purple') return '139, 92, 246';
  if (currentTheme === 'crimson') return '239, 68, 68';
  if (currentTheme === 'monochrome') return '255, 255, 255';
  return '165, 180, 252';
}

function runDotsAnim() {
  stopAnimation();
  const particles = [];
  const count = 300;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      radius: Math.random() * 2 + 1
    });
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rgb = getThemeColor();
    
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${rgb}, ${0.15 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 120;
      
      if (dist < maxDist) {
        const force = (maxDist - dist) / maxDist;
        p.x -= (dx / dist) * force * 5;
        p.y -= (dy / dist) * force * 5;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, 0.85)`;
      ctx.fill();
    }
    animFrameId = requestAnimationFrame(render);
  }
  render();
}

function runMatrixAnim() {
  stopAnimation();
  const chars = '0123456789ABCDEFOHNY';
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = new Array(columns).fill(1);

  function render() {
    ctx.fillStyle = 'rgba(7, 9, 12, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const currentTheme = document.body.getAttribute('data-theme');
    ctx.fillStyle = currentTheme === 'monochrome' ? '#ffffff' : (currentTheme === 'crimson' ? '#ef4444' : '#34d399');
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const text = chars.charAt(Math.floor(Math.random() * chars.length));
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
    animFrameId = requestAnimationFrame(render);
  }
  render();
}

function runWavesAnim() {
  stopAnimation();
  let step = 0;
  function render() {
    ctx.fillStyle = 'rgba(7, 9, 12, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    step += 0.03;
    ctx.lineWidth = 2.5;
    const rgb = getThemeColor();
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${rgb}, ${0.2 + i * 0.1})`;
      for (let x = 0; x < canvas.width; x += 15) {
        const y = Math.sin(x * 0.004 + step + i * 0.5) * 50 + (canvas.height / 2) + Math.cos((mouse.x + x) * 0.001) * 30;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    animFrameId = requestAnimationFrame(render);
  }
  render();
}

function runStarfieldAnim() {
  stopAnimation();
  const stars = [];
  for (let i = 0; i < 250; i++) {
    stars.push({
      x: (Math.random() - 0.5) * canvas.width * 2,
      y: (Math.random() - 0.5) * canvas.height * 2,
      z: Math.random() * canvas.width
    });
  }

  function render() {
    ctx.fillStyle = 'rgba(7, 9, 12, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.z -= 6;
      if (s.z <= 0) s.z = canvas.width;

      const k = 200 / s.z;
      const px = s.x * k + cx;
      const py = s.y * k + cy;

      if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
        const size = (1 - s.z / canvas.width) * 3;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }
    animFrameId = requestAnimationFrame(render);
  }
  render();
}

function applyTheme(themeName) {
  document.body.setAttribute('data-theme', themeName || 'cyberpunk');
  const mode = document.getElementById('bg-mode-select').value;
  if (mode !== 'image') {
    const currentUrl = document.getElementById('bg-url-input').value.trim() || temporaryBgData;
    setWallpaperMode(mode, currentUrl);
  }
}

function setWallpaperMode(mode, customBgUrl = null) {
  const bgOverlay = document.getElementById('bg-overlay');
  if (mode === 'image') {
    stopAnimation();
    bgOverlay.style.display = 'block';
    if (customBgUrl) {
      bgOverlay.style.backgroundImage = `url('${customBgUrl}')`;
    } else {
      bgOverlay.style.backgroundImage = 'none';
    }
  } else {
    bgOverlay.style.backgroundImage = 'none';
    bgOverlay.style.display = 'none';
    if (mode === 'dots') runDotsAnim();
    else if (mode === 'matrix') runMatrixAnim();
    else if (mode === 'waves') runWavesAnim();
    else if (mode === 'starfield') runStarfieldAnim();
    else runDotsAnim();
  }
}

function loadSettings() {
  chrome.storage.local.get(['customBg', 'bgMode', 'theme', 'appScale', 'timeFormat', 'boxOpacity'], (result) => {
    const mode = result.bgMode || 'dots';
    const theme = result.theme || 'cyberpunk';
    currentTimeFormat = result.timeFormat || '24';
    const boxOpacity = result.boxOpacity !== undefined ? result.boxOpacity : 0.82;
    
    document.getElementById('bg-mode-select').value = mode;
    document.getElementById('theme-select').value = theme;
    
    updateTimeFormatUI(currentTimeFormat);
    
    applyTheme(theme);
    setWallpaperMode(mode, result.customBg);
    updateClock();

    document.documentElement.style.setProperty('--box-opacity', boxOpacity);
    document.getElementById('opacity-slider').value = boxOpacity;
    document.getElementById('opacity-val').textContent = `${Math.round(boxOpacity * 100)}%`;

    if (result.appScale) {
      document.getElementById('app-wrapper').style.transform = `scale(${result.appScale})`;
      document.getElementById('scale-slider').value = result.appScale;
      document.getElementById('scale-val').textContent = `${Math.round(result.appScale * 100)}%`;
    }
  });
}

function updateTimeFormatUI(format) {
  currentTimeFormat = format;
  document.querySelectorAll('.time-format-btn').forEach(btn => {
    if (btn.getAttribute('data-timeformat') === format) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  updateClock();
}

document.querySelectorAll('.time-format-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    updateTimeFormatUI(btn.getAttribute('data-timeformat'));
  });
});

document.getElementById('bg-mode-select').addEventListener('change', (e) => {
  const selectedMode = e.target.value;
  const currentUrl = document.getElementById('bg-url-input').value.trim() || temporaryBgData;
  setWallpaperMode(selectedMode, currentUrl);
});

document.getElementById('theme-select').addEventListener('change', (e) => {
  applyTheme(e.target.value);
});

document.getElementById('opacity-slider').addEventListener('input', (e) => {
  const opacity = e.target.value;
  document.documentElement.style.setProperty('--box-opacity', opacity);
  document.getElementById('opacity-val').textContent = `${Math.round(opacity * 100)}%`;
  chrome.storage.local.set({ boxOpacity: opacity });
});

document.getElementById('scale-slider').addEventListener('input', (e) => {
  const scale = e.target.value;
  document.getElementById('app-wrapper').style.transform = `scale(${scale})`;
  document.getElementById('scale-val').textContent = `${Math.round(scale * 100)}%`;
  chrome.storage.local.set({ appScale: scale });
});

// EXPORT BACKUP FUNCTIONALITY
document.getElementById('export-data-btn').addEventListener('click', () => {
  chrome.storage.local.get(null, (localData) => {
    chrome.storage.sync.get(null, (syncData) => {
      const exportObj = {
        local: localData,
        sync: syncData,
        exportDate: new Date().toISOString()
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `dashboard_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  });
});

// IMPORT BACKUP FUNCTIONALITY
document.getElementById('import-data-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const importedData = JSON.parse(evt.target.result);
      if (importedData.local && importedData.sync) {
        chrome.storage.local.set(importedData.local, () => {
          chrome.storage.sync.set(importedData.sync, () => {
            alert('Settings, streamers, and YouTubers successfully imported!');
            modal.classList.add('hidden');
            loadSettings();
            loadShortcuts();
            loadStreamers();
            loadYouTubeFeeds();
          });
        });
      } else {
        alert('Invalid backup file format.');
      }
    } catch (err) {
      alert('Error parsing JSON backup file.');
    }
  };
  reader.readAsText(file);
});

const modal = document.getElementById('settings-modal');
document.getElementById('open-settings').addEventListener('click', () => {
  openSettingsModal();
  modal.classList.remove('hidden');
});
document.getElementById('close-settings').addEventListener('click', () => {
  modal.classList.add('hidden');
  loadSettings();
});

function openSettingsModal() {
  chrome.storage.sync.get(['shortcuts', 'streamers', 'ytCreators'], (result) => {
    const shortcuts = result.shortcuts || defaultShortcuts;
    const streamers = result.streamers || defaultStreamers;
    const ytCreators = result.ytCreators || defaultYtCreators;

    chrome.storage.local.get(['timeFormat'], (localRes) => {
      updateTimeFormatUI(localRes.timeFormat || '24');
    });

    const ytList = document.getElementById('edit-yt-creators-list');
    ytList.innerHTML = '';
    ytCreators.forEach((c) => addYtCreatorRow(c.id, c.type));

    const sList = document.getElementById('edit-shortcuts-list');
    sList.innerHTML = '';
    shortcuts.forEach((s) => addShortcutRow(s.name, s.url));

    const stList = document.getElementById('edit-streamers-list');
    stList.innerHTML = '';
    streamers.forEach((st) => addStreamerRow(st.name, st.url));
  });
}

function addYtCreatorRow(id = '', type = 'both') {
  const ytList = document.getElementById('edit-yt-creators-list');
  const div = document.createElement('div');
  div.className = 'edit-row';
  div.innerHTML = `
    <input type="text" value="${id}" placeholder="Channel ID (e.g. UC9x0AN...)" class="yt-id" style="width: 55%;">
    <select class="yt-type" style="width: 30%;">
      <option value="both" ${type === 'both' ? 'selected' : ''}>Both (Latest)</option>
      <option value="video" ${type === 'video' ? 'selected' : ''}>Videos Only</option>
      <option value="short" ${type === 'short' ? 'selected' : ''}>Shorts Only</option>
    </select>
    <button type="button" class="delete-btn"><i class="fa-solid fa-trash"></i></button>
  `;
  div.querySelector('.delete-btn').addEventListener('click', () => div.remove());
  ytList.appendChild(div);
}

function addShortcutRow(name = '', url = '') {
  const sList = document.getElementById('edit-shortcuts-list');
  const div = document.createElement('div');
  div.className = 'edit-row';
  div.innerHTML = `
    <input type="text" value="${name}" placeholder="Name" class="s-name" style="width: 35%;">
    <input type="text" value="${url}" placeholder="URL" class="s-url" style="width: 50%;">
    <button type="button" class="delete-btn"><i class="fa-solid fa-trash"></i></button>
  `;
  div.querySelector('.delete-btn').addEventListener('click', () => div.remove());
  sList.appendChild(div);
}

function addStreamerRow(name = '', url = '') {
  const stList = document.getElementById('edit-streamers-list');
  const div = document.createElement('div');
  div.className = 'edit-row';
  div.innerHTML = `
    <input type="text" value="${name}" placeholder="Nickname" class="st-name" style="width: 32%;">
    <input type="text" value="${url}" placeholder="Twitch URL" class="st-url" style="width: 53%;">
    <button type="button" class="delete-btn"><i class="fa-solid fa-trash"></i></button>
  `;
  div.querySelector('.delete-btn').addEventListener('click', () => div.remove());
  stList.appendChild(div);
}

document.getElementById('add-yt-creator-btn').addEventListener('click', () => addYtCreatorRow());
document.getElementById('add-shortcut-btn').addEventListener('click', () => addShortcutRow());
document.getElementById('add-streamer-btn').addEventListener('click', () => addStreamerRow());

document.getElementById('bg-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      temporaryBgData = evt.target.result;
      document.getElementById('bg-mode-select').value = 'image';
      setWallpaperMode('image', temporaryBgData);
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('reset-bg-btn').addEventListener('click', () => {
  temporaryBgData = '';
  document.getElementById('bg-url-input').value = '';
  chrome.storage.local.remove('customBg', loadSettings);
});

document.getElementById('save-settings').addEventListener('click', () => {
  const bgMode = document.getElementById('bg-mode-select').value;
  const theme = document.getElementById('theme-select').value;
  const bgUrlValue = document.getElementById('bg-url-input').value.trim();

  const settingsToSave = { 
    bgMode: bgMode, 
    theme: theme, 
    thumbMode: 'hover',
    timeFormat: currentTimeFormat
  };
  
  if (bgUrlValue) {
    settingsToSave.customBg = bgUrlValue;
  } else if (temporaryBgData !== null && temporaryBgData !== '') {
    settingsToSave.customBg = temporaryBgData;
  }

  chrome.storage.local.set(settingsToSave, () => {
    const newCreators = [];
    document.querySelectorAll('#edit-yt-creators-list .edit-row').forEach(row => {
      const id = row.querySelector('.yt-id').value.trim();
      const type = row.querySelector('.yt-type').value;
      if (id) {
        newCreators.push({ id, type });
      }
    });

    const newShortcuts = [];
    document.querySelectorAll('#edit-shortcuts-list .edit-row').forEach(row => {
      const name = row.querySelector('.s-name').value.trim();
      const url = row.querySelector('.s-url').value.trim();
      if (name && url) {
        newShortcuts.push({ name, url });
      }
    });

    const newStreamers = [];
    document.querySelectorAll('#edit-streamers-list .edit-row').forEach(row => {
      const name = row.querySelector('.st-name').value.trim();
      const url = row.querySelector('.st-url').value.trim();
      if (url) {
        try {
          const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
          const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
          const defaultNick = pathSegments[0] ? (pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1)) : 'Streamer';
          newStreamers.push({
            name: name || defaultNick,
            url: parsedUrl.href
          });
        } catch(e) {}
      }
    });

    chrome.storage.sync.set({ shortcuts: newShortcuts, streamers: newStreamers, ytCreators: newCreators }, () => {
      modal.classList.add('hidden');
      loadSettings();
      loadShortcuts();
      loadStreamers();
      loadYouTubeFeeds();
    });
  });
});

// Startup
loadSettings();
loadShortcuts();
loadStreamers();
loadYouTubeFeeds();
updateClock();
