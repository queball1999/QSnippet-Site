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

/* Fetch GitHub Releases */
const releasesContainer = document.getElementById("releases");

fetch("https://api.github.com/repos/queball1999/QSnippet/releases")
  .then(response => response.json())
  .then(releases => {
    releasesContainer.innerHTML = "";

    console.log(releases)

    releases.forEach((release, index) => {
      const div = document.createElement("div");
      div.className = "release" + (index === 0 ? " latest" : "");

      const date = new Date(release.published_at).toLocaleDateString();

      console.log(release.body)

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
