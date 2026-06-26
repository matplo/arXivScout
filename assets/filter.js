(function () {
  var input = document.getElementById("archive-search");
  var list = document.getElementById("archive-list");
  var empty = document.getElementById("empty-state");
  if (!input || !list) return;

  var cards = Array.prototype.slice.call(list.querySelectorAll(".archive-card"));

  function normalize(value) {
    return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  input.addEventListener("input", function () {
    var query = normalize(input.value);
    var shown = 0;

    cards.forEach(function (card) {
      var haystack = normalize(card.getAttribute("data-search") + " " + card.textContent);
      var match = !query || haystack.indexOf(query) !== -1;
      card.hidden = !match;
      if (match) shown += 1;
    });

    if (empty) empty.hidden = shown !== 0;
  });
})();
