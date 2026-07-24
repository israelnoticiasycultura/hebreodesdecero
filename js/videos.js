// js/videos.js
import { state, VIDEOS } from './state.js';
import { playSound } from './audio.js';
import { incrementarContadorV1, COUNTER_API_URL_V1_INC, COUNTER_API_URL_V1_HDC } from './api.js';

export function extractYouTubeVideoId(url) {
  if (!url) return null;

  const patterns = [
    /youtube\.com\/watch\?[^\s]*v=([A-Za-z0-9_-]{11})/i,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/i,
    /youtu\.be\/([A-Za-z0-9_-]{11})/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('v');
  } catch (error) {
    return null;
  }
}

export function buildYouTubeThumbnail(url) {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : "";
}

export async function loadVideosIsraelNoticias() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/israelnoticiasycultura/desmitifica/main/preguntas.json');
    if (!response.ok) throw new Error('No se pudo cargar preguntas.json');

    const data = await response.json();
    state.moreVideos = (data || [])
      .filter(item => item?.video)
      .map(item => ({
        title: item.titulo || 'Video recomendado',
        url: item.video,
        thumbnail: buildYouTubeThumbnail(item.video)
      }));
  } catch (error) {
    console.error('Error cargando videos para Más:', error);
    state.moreVideos = [];
  }
}

export function shareVideo(url, platform) {
  const shareText = 'Mirá este video que vale la pena compartir:';
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${shareText} ${url}`);

  let shareUrl = '';

  switch (platform) {
    case 'whatsapp':
      shareUrl = `https://wa.me/?text=${encodedText}`;
      break;
    case 'telegram':
      shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`;
      break;
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      break;
    default:
      break;
  }

  if (shareUrl) {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }
}

export async function copyVideoUrl(url, button) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const tempInput = document.createElement('input');
      tempInput.value = url;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }

    const originalLabel = button.innerHTML;
    button.innerHTML = '<span class="text-[10px] font-bold">¡Copiado!</span>';
    setTimeout(() => {
      button.innerHTML = originalLabel;
    }, 1200);
  } catch (error) {
    console.error('No se pudo copiar el enlace:', error);
    alert('No se pudo copiar el enlace.');
  }
}

export function createShareButtonGroup(url, counterApiUrl, { includeLabel = false } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-wrap items-center gap-2';

  if (includeLabel) {
    const label = document.createElement('span');
    label.className = 'text-sm font-medium text-slate-300 self-center mr-1';
    label.textContent = 'Compartir:';
    wrapper.appendChild(label);
  }

  const actions = [
    { action: 'whatsapp', className: 'border border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20', icon: 'message-circle' },
    { action: 'telegram', className: 'border border-sky-500/20 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20', icon: 'send' },
    { action: 'copy', className: 'border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20', icon: 'copy' },
    { action: 'facebook', className: 'border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20', icon: 'facebook' }
  ];

  actions.forEach(({ action, className, icon }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `share-btn px-2.5 py-2 rounded-xl transition-all ${className}`;
    button.setAttribute('data-share-action', action);
    button.setAttribute('data-url', url);

    if (action === 'facebook') {
      button.innerHTML = '<i class="fab fa-facebook-f"></i>';
    } else {
      button.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i>`;
    }

    button.onclick = async (event) => {
      event.stopPropagation();
      const shareAction = button.getAttribute('data-share-action');
      const shareUrl = button.getAttribute('data-url');

      if (shareAction === 'copy') {
        await copyVideoUrl(shareUrl, button);
      } else {
        shareVideo(shareUrl, shareAction);
      }

      await incrementarContadorV1(counterApiUrl);
    };

    wrapper.appendChild(button);
  });

  return wrapper;
}

export function renderMoreVideos() {
  const container = document.getElementById('moreVideosList');
  if (!container) return;

  container.innerHTML = '';

  if (!state.moreVideos.length) {
    container.innerHTML = '<div class="text-center py-8 text-sm text-slate-500">No se pudieron cargar los videos en este momento.</div>';
    return;
  }

  // Seleccionar aleatoriamente máximo 10 videos
  const shuffled = [...state.moreVideos].sort(() => Math.random() - 0.5);
  const selectedVideos = shuffled.slice(0, 10);

  selectedVideos.forEach(video => {
    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/40 transition-all flex flex-col group';

    card.innerHTML = `
      <div class="relative aspect-video w-full overflow-hidden bg-slate-950 cursor-pointer" data-video-id="${extractYouTubeVideoId(video.url) || ''}" data-video-title="${video.title}" data-video-url="${video.url}">
        <div class="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-all flex items-center justify-center z-10">
          <div class="w-12 h-12 rounded-full bg-purple-600/90 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all">
            <i data-lucide="play" class="w-5 h-5 fill-current ml-0.5"></i>
          </div>
        </div>
        <img src="${video.thumbnail}" alt="${video.title}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 filter brightness-90">
      </div>
      <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div class="space-y-1">
          <h4 class="text-sm font-bold text-slate-200 line-clamp-2 leading-normal">${video.title}</h4>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="text-sm font-medium text-slate-300 self-center mr-2">Compartir:</span>
          <button type="button" class="share-btn px-2.5 py-2 rounded-xl border border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all" data-share-action="whatsapp" data-url="${video.url}">
            <i data-lucide="message-circle" class="w-4 h-4"></i>
          </button>
          <button type="button" class="share-btn px-2.5 py-2 rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-all" data-share-action="telegram" data-url="${video.url}">
            <i data-lucide="send" class="w-4 h-4"></i>
          </button>
          <button type="button" class="share-btn px-2.5 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all" data-share-action="copy" data-url="${video.url}">
            <i data-lucide="copy" class="w-4 h-4"></i>
          </button>
          <button type="button" class="share-btn px-2.5 py-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all" data-share-action="facebook" data-url="${video.url}">
            <i class="fab fa-facebook-f"></i>
          </button>
        </div>
      </div>
    `;

    const openArea = card.querySelector('[data-video-id]');
    openArea.onclick = () => {
      const videoId = openArea.getAttribute('data-video-id');
      const title = openArea.getAttribute('data-video-title');
      const url = openArea.getAttribute('data-video-url');
      if (videoId) {
        openVideoModal(videoId, title);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    };

    card.querySelectorAll('.share-btn').forEach(button => {
      button.onclick = async (event) => {
        event.stopPropagation();
        const action = button.getAttribute('data-share-action');
        const url = button.getAttribute('data-url');

        if (action === 'copy') {
          await copyVideoUrl(url, button);
        } else {
          shareVideo(url, action);
        }

        await incrementarContadorV1(COUNTER_API_URL_V1_INC);
      };
    });

    container.appendChild(card);
  });

  lucide.createIcons();
}

export function renderVideos() {
  const container = document.getElementById("videosListContainer");
  if (!container) return;

  const filtered = VIDEOS.filter(video => state.videoFilter === 'all' || video.category === state.videoFilter);

  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-slate-500 text-sm">No se encontraron videos.</div>`;
    return;
  }

  filtered.forEach(video => {
    const card = document.createElement("div");
    card.className = "bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer hover:border-purple-500/40 transition-all flex flex-col group relative";
    const shareUrl = video.urlList || video.url || `https://youtu.be/${video.id}`;
    const videoIndex = VIDEOS.findIndex(item => item.id === video.id);
    const classLabel = videoIndex === 0 ? 'INTRODUCCIÓN' : `CLASE ${videoIndex}`;

    card.innerHTML = `
      <div class="relative aspect-video w-full overflow-hidden bg-slate-950">
        <div class="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-all flex items-center justify-center z-10">
          <div class="w-12 h-12 rounded-full bg-purple-600/90 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all">
            <i data-lucide="play" class="w-5 h-5 fill-current ml-0.5"></i>
          </div>
        </div>
        <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="${video.title}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 filter brightness-90">
        <span class="absolute bottom-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-bold text-slate-300 z-20">${video.duration}</span>
      </div>
      <div class="flex items-start gap-3 p-4">
        <div class="space-y-2">
          <span class="text-[10px] font-bold leading-tight text-slate-100 border border-purple-800/30 px-2 py-0.5 rounded-full">${classLabel}</span>
          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950/50 border border-purple-800/30 px-2 py-0.5 rounded-full">${video.category === 'alfabeto' ? 'Alfabeto' : video.category === 'phrases' ? 'Vocabulario' : 'Gramática'}</span>
          <h4 class="text-sm font-bold text-slate-200 line-clamp-2 pt-1 leading-normal group-hover:text-purple-300 transition-colors">${video.title}</h4>
          <div class="video-share-actions"></div>
          </div>
        </div>
      </div>
    `;

    const shareContainer = card.querySelector('.video-share-actions');
    shareContainer.appendChild(createShareButtonGroup(shareUrl, COUNTER_API_URL_V1_HDC, { includeLabel: true }));

    card.onclick = () => {
      openVideoModal(video.id, video.title, shareUrl);
    };

    container.appendChild(card);
  });
  lucide.createIcons();
}

export function handleVideoFilter(filterName, btn) {
  playSound('click');
  state.videoFilter = filterName;

  // Actualizar botones
  document.querySelectorAll(".video-filter-btn").forEach(b => {
    b.className = "video-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 transition-all";
  });
  btn.className = "video-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-purple-600 text-white shadow-sm border border-purple-500/20";

  renderVideos();
}

export function openVideoModal(videoId, title, shareUrl = `https://youtu.be/${videoId}`) {
  playSound('click');

  const modal = document.getElementById("youtubeModal");
  const iframe = document.getElementById("youtubeIframe");
  const titleEl = document.getElementById("youtubeModalTitle");
  const openAppBtn = document.getElementById("youtubeOpenAppBtn");
  const shareActionsContainer = document.getElementById("youtubeShareActions");

  titleEl.textContent = title;
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
  openAppBtn.href = `https://youtu.be/${videoId}`;

  if (shareActionsContainer) {
    shareActionsContainer.innerHTML = '';
    shareActionsContainer.appendChild(createShareButtonGroup(shareUrl, COUNTER_API_URL_V1_HDC));
  }

  modal.classList.remove("hidden");
  // Retraso para disparar la animación CSS de fade in + scale
  setTimeout(() => {
    modal.classList.remove("opacity-0", "scale-95");
  }, 10);
  lucide.createIcons();
}

export function closeVideoModal() {
  playSound('click');

  const modal = document.getElementById("youtubeModal");
  const iframe = document.getElementById("youtubeIframe");

  modal.classList.add("opacity-0", "scale-95");
  setTimeout(() => {
    modal.classList.add("hidden");
    iframe.src = ""; // Detener video
  }, 300);
}

// Exponer en window para que index.html pueda acceder a handleVideoFilter si hay onClick inline, 
// o podemos añadir el listener en app.js. Aquí exponemos `closeVideoModal` para el HTML
window.closeVideoModal = closeVideoModal;
window.handleVideoFilter = handleVideoFilter;
window.copyVideoUrl = copyVideoUrl;
