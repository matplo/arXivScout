(function () {
  var input = document.getElementById("archive-search");
  var scope = document.getElementById("archive-list") || document.querySelector("main");
  var empty = document.getElementById("empty-state");
  if (!input || !scope) return;

  var items = Array.prototype.slice.call(scope.querySelectorAll(".archive-card, .paper"));

  function normalize(value) {
    return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  input.addEventListener("input", function () {
    var query = normalize(input.value);
    var shown = 0;

    items.forEach(function (item) {
      var haystack = normalize(item.getAttribute("data-search") + " " + item.textContent);
      var match = !query || haystack.indexOf(query) !== -1;
      item.hidden = !match;
      if (match) shown += 1;
    });

    if (empty) empty.hidden = shown !== 0;
  });
})();