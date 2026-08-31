(function () {
  var input = document.getElementById("archive-search");
  var period = document.getElementById("archive-period");
  var startInput = document.getElementById("archive-start");
  var endInput = document.getElementById("archive-end");
  var scope = document.getElementById("archive-list") || document.querySelector("main");
  var empty = document.getElementById("empty-state");
  var manifest = Array.isArray(window.ARCHIVE_REPORTS) ? window.ARCHIVE_REPORTS.slice() : null;
  var cards = [];

  if (!input || !scope) return;

  function normalize(value) {
    return (value || "").toString().toLowerCase().replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return (value || "").toString().replace(/[&<>"']/g, function (char) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[char];
    });
  }

  function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function paperId(paper) {
    return paper.arxiv_id || paper.id || "";
  }

  function cardTitle(report) {
    var keywords = asArray(report.keywords).slice(0, 5).join(", ");
    if (keywords) return keywords;
    if (report.strongest_paper || report.strongest_paper_summary) {
      return (report.strongest_paper || report.strongest_paper_summary).replace(/^arXiv:/, "");
    }
    return "Heavy-ion and physics AI briefing";
  }

  function compactSummary(report) {
    var text = report.summary || report.professional_summary || "";
    if (text.length <= 420) return text;
    return text.slice(0, 417).replace(/\s+\S*$/, "") + "...";
  }

  function authorText(paper) {
    var authors = paper.short_authors || paper.authors || paper.author || "";
    if (Array.isArray(authors)) authors = authors.join(", ");
    return authors;
  }

  function lineTags(paper) {
    var tags = asArray(paper.tags).slice(0, 4);
    if (!tags.length && paper.category) tags = [paper.category];
    if (!tags.length && paper.title) tags = [paper.title];
    return tags.join(", ");
  }

  function buildSearch(report, path) {
    var papers = asArray(report.papers).concat(asArray(report.cautions));
    return normalize([
      report.date,
      path,
      report.summary,
      report.strongest_paper,
      report.strongest_paper_summary,
      asArray(report.keywords).join(" "),
      asArray(report.arxiv_ids).join(" "),
      asArray(report.represented_categories).join(" "),
      papers.map(function (paper) {
        return [paper.title, authorText(paper), paperId(paper), paper.category, asArray(paper.tags).join(" "), paper.abstract, paper.assessment].join(" ");
      }).join(" ")
    ].join(" "));
  }

  function renderCard(report, fallback) {
    var path = report.path || fallback.path;
    var papers = asArray(report.papers);
    var cautions = asArray(report.cautions);
    var paperById = {};
    papers.concat(cautions).forEach(function (paper) {
      var id = paperId(paper);
      if (id && !paperById[id]) paperById[id] = paper;
    });

    var ids = asArray(report.arxiv_ids);
    if (!ids.length) {
      ids = papers.concat(cautions).map(paperId).filter(Boolean);
    }

    var lines = ids.map(function (id) {
      var paper = paperById[id] || {};
      var tags = lineTags(paper);
      return "<p><strong>" + escapeHtml(id) + ":</strong> " + escapeHtml(tags || "archived selection") + "</p>";
    }).join("");

    if (!lines) {
      lines = "<p><strong>" + escapeHtml(report.date || fallback.date) + ":</strong> archived report metadata</p>";
    }

    var count = report.total_paper_count || papers.length || ids.length;
    var cautionCount = Number.isFinite(report.caution_count) ? report.caution_count : cautions.length;
    var countText = count + " selected paper" + (count === 1 ? "" : "s");
    if (cautionCount) countText += " + " + cautionCount + " caution" + (cautionCount === 1 ? "" : "s");

    var categories = asArray(report.represented_categories);
    var tags = categories.concat(cautionCount && categories.indexOf("Caution") === -1 ? ["Caution: " + cautionCount] : []);
    var tagHtml = tags.slice(0, 8).map(function (tag) {
      return "<span>" + escapeHtml(tag) + "</span>";
    }).join("");

    var card = document.createElement("article");
    card.className = "archive-card";
    card.setAttribute("data-date", report.date || fallback.date);
    card.setAttribute("data-search", buildSearch(report, path));
    card.innerHTML =
      "<div class=\"card-top\"><time datetime=\"" + escapeHtml(report.date || fallback.date) + "\">" + escapeHtml(report.date || fallback.date) + "</time><span>" + escapeHtml(countText) + "</span></div>" +
      "<h2><a href=\"" + escapeHtml(path) + "\">" + escapeHtml(cardTitle(report)) + "</a></h2>" +
      "<p>" + escapeHtml(compactSummary(report) || "Archived Daily arXiv Physics Scout report.") + "</p>" +
      "<div class=\"arxiv-lines\">" + lines + "</div>" +
      (tagHtml ? "<div class=\"tags\">" + tagHtml + "</div>" : "");
    return card;
  }

  function renderFallback(entry) {
    return renderCard({
      date: entry.date,
      path: entry.path,
      summary: "Archived Daily arXiv Physics Scout report. Metadata could not be loaded, but the report page is available.",
      keywords: ["heavy-ion physics", "AI/ML in physics"],
      represented_categories: ["Archived report"],
      arxiv_ids: [],
      total_paper_count: 0,
      caution_count: 0,
      papers: []
    }, entry);
  }

  function latestArchiveDate() {
    if (!cards.length) return null;
    return cards.reduce(function (latest, card) {
      var value = card.getAttribute("data-date");
      return !latest || value > latest ? value : latest;
    }, null);
  }

  function inSelectedRange(dateValue) {
    if (!period) return true;
    var selected = period.value || "all";
    if (selected === "all") return true;

    var start = startInput && startInput.value ? startInput.value : "";
    var end = endInput && endInput.value ? endInput.value : "";

    if (selected !== "custom") {
      var latest = latestArchiveDate();
      if (!latest) return true;
      var days = parseInt(selected, 10);
      var startDate = new Date(latest + "T00:00:00Z");
      startDate.setUTCDate(startDate.getUTCDate() - days + 1);
      start = startDate.toISOString().slice(0, 10);
      end = latest;
    }

    if (start && dateValue < start) return false;
    if (end && dateValue > end) return false;
    return true;
  }

  function applyFilters() {
    var query = normalize(input.value);
    var shown = 0;

    cards.forEach(function (item) {
      var haystack = normalize(item.getAttribute("data-search") + " " + item.textContent);
      var dateValue = item.getAttribute("data-date") || "";
      var textMatch = !query || haystack.indexOf(query) !== -1;
      var dateMatch = inSelectedRange(dateValue);
      var match = textMatch && dateMatch;
      item.hidden = !match;
      if (match) shown += 1;
    });

    if (empty) empty.hidden = shown !== 0;
  }

  function bindFilters() {
    input.addEventListener("input", applyFilters);
    if (period) {
      period.addEventListener("change", function () {
        var custom = period.value === "custom";
        [startInput, endInput].forEach(function (field) {
          if (field) field.disabled = !custom;
        });
        applyFilters();
      });
    }
    [startInput, endInput].forEach(function (field) {
      if (field) field.addEventListener("input", applyFilters);
    });
    if (period && period.value !== "custom") {
      [startInput, endInput].forEach(function (field) {
        if (field) field.disabled = true;
      });
    }
  }

  function loadArchive() {
    if (!manifest) {
      cards = Array.prototype.slice.call(scope.querySelectorAll(".archive-card, .paper"));
      bindFilters();
      applyFilters();
      return;
    }

    manifest.sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });

    Promise.all(manifest.map(function (entry) {
      return fetch(entry.metadata, {cache: "no-cache"})
        .then(function (response) {
          if (!response.ok) throw new Error("metadata unavailable");
          return response.json();
        })
        .then(function (report) {
          return renderCard(report, entry);
        })
        .catch(function () {
          return renderFallback(entry);
        });
    })).then(function (rendered) {
      scope.innerHTML = "";
      rendered.forEach(function (card) {
        scope.appendChild(card);
      });
      cards = rendered;
      bindFilters();
      applyFilters();
    });
  }

  loadArchive();
})();
