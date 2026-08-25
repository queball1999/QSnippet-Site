/* Configure Marked Library */
const renderer = new marked.Renderer();

renderer.link = function (token) {
  return `<a href="${token.href}" target="_blank" rel="noopener noreferrer">${token.text}</a>`;
};

marked.setOptions({
  renderer,
  breaks: false,
  gfm: true
});

/* Pagination State */
let allReleases = [];
let currentPage = 1;
let pageSize = 5;

const releasesContainer = document.getElementById("releases");
const searchInput = document.getElementById("release-search");
const paginationContainer = document.getElementById("pagination");
const channelSelect = document.getElementById("channel-select");

/* Release channel
 *
 * QSnippet CI publishes two kinds of GitHub Release: a "-release" tag,
 * built from main, marked prerelease:false, and a "-dev" tag, built from
 * any branch for early testing, marked prerelease:true. The GitHub API
 * carries that distinction on each release object as release.prerelease,
 * so no separate feed or naming convention is needed here - the same
 * boolean CI sets is exactly what this filters on.
 *
 * Defaults to "main" and is remembered per-visitor via localStorage, so a
 * visitor who has never opted in only ever sees stable releases, and one
 * who has opted into dev builds does not have to reselect it every visit.
 */
const CHANNEL_STORAGE_KEY = "qsnippet-release-channel";

function loadChannelPreference() {
  try {
    const stored = localStorage.getItem(CHANNEL_STORAGE_KEY);
    return stored === "dev" ? "dev" : "main";
  } catch (err) {
    // Private browsing / storage disabled: fall back to the safe default.
    return "main";
  }
}

function saveChannelPreference(channel) {
  try {
    localStorage.setItem(CHANNEL_STORAGE_KEY, channel);
  } catch (err) {
    // Non-fatal: the selection still applies for this page view.
  }
}

channelSelect.value = loadChannelPreference();

/* Get filtered releases based on the selected channel and search query */
function getFilteredReleases() {
  const query = searchInput.value.toLowerCase();
  const channel = channelSelect.value;

  const inChannel = allReleases.filter(release =>
    channel === "dev" ? true : !release.prerelease
  );

  if (!query) {
    return inChannel;
  }

  return inChannel.filter(release => {
    // Match version/tag name
    const tagMatch = (release.name || release.tag_name).toLowerCase().includes(query);

    // Match OS keywords in asset filenames
    const assetMatch = release.assets.some(asset =>
      asset.name.toLowerCase().includes(query)
    );

    return tagMatch || assetMatch;
  });
}

/* Render release cards for current page */
function renderReleases() {
  const filtered = getFilteredReleases();
  const totalPages = Math.ceil(filtered.length / pageSize);

  // Reset to page 1 if current page exceeds total
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = 1;
  }

  // Calculate slice bounds
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageReleases = filtered.slice(startIdx, endIdx);

  // Render releases
  releasesContainer.innerHTML = "";

  if (pageReleases.length === 0) {
    releasesContainer.innerHTML = '<p class="loading">No releases found.</p>';
    paginationContainer.innerHTML = "";
    return;
  }

  pageReleases.forEach((release, index) => {
    const div = document.createElement("div");
    div.className = "release" + (index === 0 && currentPage === 1 ? " latest" : "");

    const date = new Date(release.published_at).toLocaleDateString();

    div.innerHTML = `
      <div class="release-header">
          <h3>
          <a
              href="${release.html_url}"
              target="_blank"
              rel="noopener noreferrer"
          >
              ${release.name || release.tag_name}
          </a>
          </h3>
          <span class="release-date">${date}</span>
      </div>

      ${release.body ? `
      <div class="release-body">
          ${marked.parse(release.body)}
      </div>
      ` : ""}

      <div class="release-assets">
        ${release.assets.map(asset => `
          <a href="${asset.browser_download_url}">
            ${asset.name}
          </a>
        `).join("")}
      </div>
    `;

    releasesContainer.appendChild(div);
  });

  // Render pagination
  renderPagination(filtered.length);
}

/* Render pagination controls */
function renderPagination(totalReleases) {
  const totalPages = Math.ceil(totalReleases / pageSize) || 1;

  const prevBtn = document.createElement("button");
  prevBtn.className = "pagination-btn";
  prevBtn.textContent = "← Previous";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderReleases();
    }
  };

  const pageInfo = document.createElement("span");
  pageInfo.className = "pagination-info";
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  const nextBtn = document.createElement("button");
  nextBtn.className = "pagination-btn";
  nextBtn.textContent = "Next →";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderReleases();
    }
  };

  const pageSizeSelect = document.createElement("select");
  pageSizeSelect.className = "pagination-select";
  pageSizeSelect.innerHTML = `
    <option value="5" ${pageSize === 5 ? "selected" : ""}>5 per page</option>
    <option value="10" ${pageSize === 10 ? "selected" : ""}>10 per page</option>
    <option value="25" ${pageSize === 25 ? "selected" : ""}>25 per page</option>
    <option value="all" ${pageSize === totalReleases ? "selected" : ""}>All</option>
  `;
  pageSizeSelect.onchange = (e) => {
    pageSize = e.target.value === "all" ? totalReleases : parseInt(e.target.value);
    currentPage = 1;
    renderReleases();
  };

  paginationContainer.innerHTML = "";
  paginationContainer.appendChild(prevBtn);
  paginationContainer.appendChild(pageInfo);
  paginationContainer.appendChild(nextBtn);
  paginationContainer.appendChild(pageSizeSelect);
}

/* Search event listener */
searchInput.addEventListener("input", () => {
  currentPage = 1;
  renderReleases();
});

/* Channel event listener */
channelSelect.addEventListener("change", () => {
  saveChannelPreference(channelSelect.value);
  currentPage = 1;
  renderReleases();
});

/* Fetch GitHub Releases */
fetch("https://api.github.com/repos/queball1999/QSnippet/releases")
  .then(response => response.json())
  .then(releases => {
    allReleases = releases;
    renderReleases();
  })
  .catch(() => {
    releasesContainer.innerHTML = `
    <div class="release-error">
        <p>Unable to load releases.</p>
        <p>
        Please report this issue on
        <a
            href="https://github.com/queball1999/QSnippet/issues"
            target="_blank"
            rel="noopener noreferrer"
        >
            GitHub
        </a>.
        </p>
    </div>
    `;
  });