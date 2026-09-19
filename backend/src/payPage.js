/**
 * Fees ka payment page - /pay/<token>. App (APK / web) isi ko kholti hai, isliye
 * app me koi native payment library nahi chahiye. Razorpay checkout ya demo buttons.
 * Saara data API se aata hai aur textContent se lagta hai - HTML injection nahi.
 */
const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Fee payment</title>
<style>
  :root { --p:#059669; --pd:#047857; --bg:#f3f7f5; --card:#fff; --t:#0b2a22; --m:#587069; --b:#dbe8e2; --r:#dc2626; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:var(--bg); color:var(--t); }
  .wrap { max-width:440px; margin:0 auto; padding:24px 16px 40px; }
  .card { background:var(--card); border:1px solid var(--b); border-radius:20px; padding:20px; box-shadow:0 12px 32px -16px rgba(11,42,34,.25); }
  .school { display:flex; align-items:center; gap:12px; margin-bottom:18px; }
  .logo { width:44px; height:44px; border-radius:12px; background:var(--p); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; overflow:hidden; }
  .logo img { width:100%; height:100%; object-fit:contain; background:#fff; }
  .muted { color:var(--m); font-size:13px; }
  h1 { font-size:18px; margin:0; }
  .amount { font-size:34px; font-weight:800; margin:6px 0 2px; }
  ul { list-style:none; padding:0; margin:16px 0; border-top:1px solid var(--b); }
  li { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--b); font-size:14px; }
  button { width:100%; border:0; border-radius:14px; padding:15px; font-size:16px; font-weight:700; cursor:pointer; background:var(--p); color:#fff; margin-top:10px; }
  button:hover { background:var(--pd); }
  button.ghost { background:transparent; color:var(--r); border:1px solid var(--b); }
  button:disabled { opacity:.6; cursor:default; }
  .demo { background:#fef3c7; color:#92400e; border-radius:12px; padding:10px 12px; font-size:13px; margin-top:12px; }
  .ok { text-align:center; }
  .ok .tick { width:64px; height:64px; border-radius:50%; background:#d1fae5; color:var(--p); display:flex; align-items:center; justify-content:center; font-size:34px; margin:4px auto 12px; }
  .err { color:var(--r); font-size:14px; margin-top:10px; }
  .foot { text-align:center; margin-top:16px; font-size:12px; color:var(--m); }
</style>
</head>
<body>
<div class="wrap"><div class="card" id="card"><p class="muted">Loading...</p></div>
<p class="foot">Secure payment - ERPSC</p></div>
<script>
(function () {
  var token = location.pathname.split('/').pop();
  var api = '/api/public/pay/' + token;
  var card = document.getElementById('card');
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function rs(n) { return 'Rs ' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || 'Error'); return j; }); });
  }
  function header(d) {
    var h = el('div', 'school');
    var logo = el('div', 'logo');
    if (d.school.logo) { var img = el('img'); img.src = d.school.logo; img.alt = ''; logo.appendChild(img); }
    else logo.textContent = (d.school.name || 'S').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('');
    var t = el('div'); t.appendChild(el('h1', null, d.school.name || 'School'));
    t.appendChild(el('div', 'muted', 'Fee payment - ' + d.ref));
    h.appendChild(logo); h.appendChild(t); return h;
  }
  function done(d) {
    card.innerHTML = '';
    card.appendChild(header(d));
    var ok = el('div', 'ok');
    ok.appendChild(el('div', 'tick', '\\u2713'));
    ok.appendChild(el('div', 'amount', rs(d.amount)));
    ok.appendChild(el('p', null, 'Payment ho gaya' + (d.gateway === 'demo' ? ' (demo)' : '')));
    if (d.receiptNos && d.receiptNos.length) ok.appendChild(el('p', 'muted', 'Receipt: ' + d.receiptNos.join(', ')));
    ok.appendChild(el('p', 'muted', 'Ab app par wapas jaiye - fees apne aap update ho jayengi.'));
    var b = el('button', null, 'App par wapas');
    b.onclick = function () { if (history.length > 1) history.back(); else window.close(); };
    ok.appendChild(b);
    card.appendChild(ok);
  }
  function show(d, msg) {
    if (d.status === 'paid') return done(d);
    card.innerHTML = '';
    card.appendChild(header(d));
    card.appendChild(el('div', 'muted', (d.student.firstName || '') + ' (' + (d.student.admissionNo || '') + ')'));
    card.appendChild(el('div', 'amount', rs(d.amount)));
    var ul = el('ul');
    d.lines.forEach(function (l) { var li = el('li'); li.appendChild(el('span', null, l.feeHead)); li.appendChild(el('span', null, rs(l.amount))); ul.appendChild(li); });
    card.appendChild(ul);
    if (d.status === 'expired') { card.appendChild(el('p', 'err', 'Ye link purana ho gaya. App me dobara "Pay online" dabaiye.')); return; }
    var err = el('p', 'err', msg || (d.status === 'failed' ? (d.failureReason || 'Pichhla payment fail hua - dobara try kijiye') : ''));
    if (d.gateway === 'demo') {
      var pay = el('button', null, 'Pay ' + rs(d.amount) + ' (demo)');
      var fail = el('button', 'ghost', 'Fail karke dekhiye (demo)');
      pay.onclick = function () { pay.disabled = fail.disabled = true; post(api + '/demo', { outcome: 'success' }).then(function () { return reload(); }).catch(function (e) { show(d, e.message); }); };
      fail.onclick = function () { pay.disabled = fail.disabled = true; post(api + '/demo', { outcome: 'fail' }).then(function () { return reload(); }).catch(function (e) { show(d, e.message); }); };
      card.appendChild(pay); card.appendChild(fail);
      card.appendChild(el('div', 'demo', 'DEMO mode - koi asli paisa nahi katega. School Razorpay jodega tab asli payment hoga.'));
    } else {
      var btn = el('button', null, 'Pay ' + rs(d.amount));
      btn.onclick = function () { btn.disabled = true; openRazorpay(d, btn, err); };
      card.appendChild(btn);
    }
    card.appendChild(err);
  }
  // verify/demo ke jawab me school/student nahi hota - page ka poora data dobara
  function reload(msg) {
    return fetch(api).then(function (r) { return r.json(); }).then(function (j) { if (j.success) show(j.data, msg); });
  }
  function openRazorpay(d, btn, err) {
    function go() {
      var rzp = new window.Razorpay({
        key: d.razorpay.keyId, order_id: d.razorpay.orderId, amount: Math.round(d.amount * 100), currency: 'INR',
        name: d.school.name, description: 'Fees ' + d.ref, theme: { color: '#059669' },
        handler: function (r) {
          err.textContent = 'Verify ho raha hai...';
          post(api + '/verify', r).then(function () { return reload(); }).catch(function (e) { err.textContent = e.message; btn.disabled = false; });
        },
        modal: { ondismiss: function () { btn.disabled = false; } }
      });
      rzp.on('payment.failed', function (r) { err.textContent = (r.error && r.error.description) || 'Payment fail hua'; btn.disabled = false; });
      rzp.open();
    }
    if (window.Razorpay) return go();
    var s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = go; s.onerror = function () { err.textContent = 'Razorpay load nahi hua - internet check kijiye'; btn.disabled = false; };
    document.head.appendChild(s);
  }
  fetch(api).then(function (r) { return r.json(); }).then(function (j) {
    if (!j.success) { card.innerHTML = ''; card.appendChild(el('p', 'err', j.message || 'Link galat hai')); return; }
    show(j.data);
  }).catch(function () { card.innerHTML = ''; card.appendChild(el('p', 'err', 'Server se connect nahi ho paaya')); });
})();
</script>
</body>
</html>`;

export function payPage(req, res) {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    res.type('html').send(PAGE);
}
