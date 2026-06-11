<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EmberCalls</title>
  <style>
    body { font-family: Arial; background: #140000; color: white; padding: 20px; }
    input, textarea, button { margin: 10px 0; padding: 12px; width: 300px; }
    button { background: #ff3b3b; color: white; border: none; cursor: pointer; }
    .card { background: #2a0000; padding: 15px; margin: 15px 0; border-radius: 10px; max-width: 400px; }
  </style>
</head>
<body>
  <h1>EmberCalls</h1>

  <div id="authSection">
    <h2>Register</h2>
    <input id="regEmail" placeholder="Email" type="email">
    <input id="regPassword" placeholder="Password" type="password">
    <button onclick="register()">Register</button>

    <h2>Login</h2>
    <input id="loginEmail" placeholder="Email" type="email">
    <input id="loginPassword" placeholder="Password" type="password">
    <button onclick="login()">Login</button>
  </div>

  <div id="appSection" style="display:none;">
    <h2>Account</h2>
    <p id="account"></p>
    <button onclick="loadMe()">Refresh</button>
    <button onclick="logout()">Logout</button>

    <h2>Buy Credits (Demo)</h2>
    <button onclick="buyCredits('10min')">10min</button>
    <button onclick="buyCredits('60min')">60min</button>
    <button onclick="buyCredits('360min')">360min</button>

    <h2>Create Creator</h2>
    <input id="displayName" placeholder="Display Name">
    <textarea id="bio" placeholder="Bio"></textarea>
    <input id="rate" placeholder="Rate per minute" type="number">
    <button onclick="createCreator()">Create Creator</button>

    <h2>Creators</h2>
    <button onclick="loadCreators()">Load Creators</button>
    <div id="creators"></div>
  </div>

  <script>
    let token = localStorage.getItem("token");

    async function api(url, method="GET", body=null) {
      const headers = {"Content-Type": "application/json"};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(url, {method, headers, body: body? JSON.stringify(body):null});
      return res.json();
    }

    async function register() {
      const data = await api("/api/register", "POST", {
        email: document.getElementById("regEmail").value,
        password: document.getElementById("regPassword").value
      });
      if (data.token) {
        token = data.token;
        localStorage.setItem("token", token);
        showApp();
      }
      alert(JSON.stringify(data));
    }

    async function login() {
      const data = await api("/api/login", "POST", {
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value
      });
      if (data.token) {
        token = data.token;
        localStorage.setItem("token", token);
        showApp();
      }
      alert(JSON.stringify(data));
    }

    function showApp() {
      document.getElementById("authSection").style.display = "none";
      document.getElementById("appSection").style.display = "block";
      loadMe();
    }

    async function loadMe() {
      const data = await api("/api/me");
      document.getElementById("account").innerText = `Email: ${data.email} | Credits: ${data.credits}`;
    }

    async function buyCredits(pkg) {
      const data = await api("/api/buy-credits-demo", "POST", {packageName: pkg});
      alert(JSON.stringify(data));
      loadMe();
    }

    async function createCreator() {
      const data = await api("/api/creator", "POST", {
        displayName: document.getElementById("displayName").value,
        bio: document.getElementById("bio").value,
        ratePerMinute: Number(document.getElementById("rate").value)
      });
      alert(JSON.stringify(data));
    }

    async function loadCreators() {
      const data = await api("/api/creators");
      const div = document.getElementById("creators");
      div.innerHTML = "";
      data.forEach(c => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `<h3>\( {c.display_name}</h3><p> \){c.rate_per_minute} credits/min</p><button onclick="startCall(${c.id})">Call Now</button>`;
        div.appendChild(card);
      });
    }

    async function startCall(id) {
      const data = await api("/api/start-call", "POST", {creatorId: id});
      if (data.success) {
        localStorage.setItem("roomId", data.roomId);
        localStorage.setItem("sessionId", data.session.id);
        localStorage.setItem("iceServers", JSON.stringify(data.iceServers));
        window.location.href = "/call.html";
      } else {
        alert(JSON.stringify(data));
      }
    }

    function logout() {
      localStorage.removeItem("token");
      location.reload();
    }

    if (token) showApp();
  </script>
</body>
</html>
