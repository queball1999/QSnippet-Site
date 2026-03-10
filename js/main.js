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

/* Get filtered releases based on search query */
function getFilteredReleases() {
  const query = searchInput.value.toLowerCase();

  if (!query) {
    return allReleases;
  }

  return allReleases.filter(release => {
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