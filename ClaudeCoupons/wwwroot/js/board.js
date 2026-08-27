// Board interactions: unlock a pass, open it, and ask "did it work?" when the visitor
// comes back to this tab - the human who just saw claude.ai's answer is the only validity
// check that exists (see README: claude.ai gives automation nothing to read).
(function () {
  'use strict';

  var csrf = document.querySelector('#csrf input[name="__RequestVerificationToken"]');
  var pendingOutcomeId = null;

  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': csrf ? csrf.value : '' },
      body: body || null,
    });
  }

  function card(id) {
    return document.querySelector('.pass-card[data-id="' + id + '"]');
  }

  // Swap the card into its unlocked state: real link + outcome buttons.
  function reveal(id, url) {
    var el = card(id);
    if (!el) return;
    el.querySelector('.pass-code').textContent = url.replace('https://', '');
    el.querySelector('.pass-actions').innerHTML =
      '<a class="btn btn-go" href="' + url + '" target="_blank" rel="nofollow noopener">Open your pass ↗</a>' +
      '<span class="outcome-ask" data-id="' + id + '" hidden>Did it work? ' +
      '<button class="mini" data-result="claimed">✓ Claimed it</button> ' +
      '<button class="mini" data-result="dead">✗ Didn’t work</button></span>';
  }

  document.addEventListener('click', function (e) {
    var unlock = e.target.closest('.btn-unlock');
    if (unlock) {
      unlock.disabled = true;
      unlock.textContent = 'Unlocking…';
      var id = unlock.dataset.id;
      post('/api/passes/' + id + '/unlock')
        .then(function (r) {
          if (r.status === 401) {
            location.href = '/signin?returnUrl=%2F';
            return null;
          }
          return r.json().then(function (data) {
            if (!r.ok) throw new Error(data.error || 'Something went wrong.');
            reveal(id, data.url);
            pendingOutcomeId = id;
            window.open(data.url, '_blank', 'noopener');
          });
        })
        .catch(function (err) {
          unlock.disabled = false;
          unlock.textContent = 'Unlock this pass';
          alert(err.message);
        });
      return;
    }

    var outcome = e.target.closest('.outcome-ask .mini');
    if (outcome) {
      var ask = outcome.closest('.outcome-ask');
      var form = new FormData();
      form.append('result', outcome.dataset.result);
      post('/api/passes/' + ask.dataset.id + '/outcome', form);
      ask.outerHTML = '<span class="outcome-thanks">Thanks - that keeps the board honest.</span>';
      pendingOutcomeId = null;
    }
  });

  // Opening a pass means leaving for claude.ai; when the visitor returns, surface the question
  // while the answer is still on their screen.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    var id = pendingOutcomeId;
    if (!id) return;
    var el = card(id);
    var ask = el && el.querySelector('.outcome-ask');
    if (ask) {
      ask.hidden = false;
      ask.classList.add('outcome-pulse');
    }
  });

  // A click on "Open your pass" for an already-unlocked card also deserves the follow-up.
  document.addEventListener('click', function (e) {
    var go = e.target.closest('.btn-go');
    if (go) {
      var el = go.closest('.pass-card');
      if (el && el.querySelector('.outcome-ask')) pendingOutcomeId = el.dataset.id;
    }
  });
})();
