document.addEventListener('DOMContentLoaded', () => {
    const MAX_TOTAL_VOTES = 20;
    let totalVotes = 0;
    let currentSystemStatus = 'open'; 
    let currentAdminPassword = ''; 

    // Ссылки на API сервера
    const STATUS_URL = 'http://localhost:3000/api/voting-status';
    const LOGIN_URL = 'http://localhost:3000/api/admin-login';
    const ADMIN_URL = 'http://localhost:3000/api/admin-results';
    const CHANGE_STATUS_URL = 'http://localhost:3000/api/admin-change-status';
    const RESET_URL = 'http://localhost:3000/api/admin-reset-scores';
    const SERVER_URL = 'http://localhost:3000/api/submit-votes';
    const CARDS_URL = 'http://localhost:3000/api/admin-cards';

    const cartCountEl = document.getElementById('cart-count');
    const headerCartBtn = document.getElementById('header-cart');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartSidebarList = document.getElementById('cart-sidebar-list');
    const sidebarTotalCount = document.getElementById('cart-sidebar-total-count');
    const sidebarSubmitBtn = document.getElementById('sidebar-submit-btn');
    const cardsContainer = document.getElementById('cards-container');

    // Генерируем инфо-плашку предупреждений на лету
    document.body.insertAdjacentHTML('beforeend', `<div id="status-bar" class="voting-status-bar">Voting is paused</div>`);
    const statusBar = document.getElementById('status-bar');

    // Инъекция стилей админки, чтобы ничего не ломалось в основном CSS
    const adminStyles = `
        <style>
            .admin-modal-v2 { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10, 10, 12, 0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); display: flex; align-items: center; justify-content: center; z-index: 99999; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; font-family: 'Neulis Sans', sans-serif !important; }
            .admin-modal-v2.active { opacity: 1; pointer-events: auto; }
            .admin-box { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 24px; padding: 30px; width: 90%; max-width: 460px; color: #ffffff; box-shadow: 0 20px 50px rgba(0,0,0,0.6); font-family: 'Neulis Sans', sans-serif !important; }
            .admin-box * { font-family: 'Neulis Sans', sans-serif !important; }
            .admin-title-v2 { font-size: 22px; font-weight: 700; margin-bottom: 20px; display: block; }
            .admin-input-v2 { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 12px; color: #fff; font-size: 14px; margin-bottom: 15px; box-sizing: border-box; outline: none; }
            .admin-btn-v2 { width: 100%; background: #ffffff; color: #111116; border: none; padding: 12px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: background 0.2s; margin-bottom: 8px; }
            .admin-btn-v2:hover { background: #e2e2e9; }
            .admin-row-v2 { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); padding: 10px 14px; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', adminStyles);

    // Авто-генерация структуры скрытой админки
    const adminModalHTML = `
        <div id="admin-modal" class="admin-modal-v2">
            <div class="admin-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <span id="admin-modal-title" class="admin-title-v2" style="margin:0;">Admin Authorization 🔐</span>
                    <button id="close-admin-btn" style="background:transparent; border:none; color:rgba(255,255,255,0.5); font-size:26px; cursor:pointer; line-height:1;">&times;</button>
                </div>
                <div id="admin-main-body"></div>
            </div>
        </div>
    `;
    if (document.getElementById('admin-modal')) document.getElementById('admin-modal').remove();
    document.body.insertAdjacentHTML('beforeend', adminModalHTML);

    const adminModal = document.getElementById('admin-modal');
    const closeAdminBtn = document.getElementById('close-admin-btn');
    const adminModalTitle = document.getElementById('admin-modal-title');
    const adminMainBody = document.getElementById('admin-main-body');

    // Загрузка динамических карточек с сервера
    function loadCardsFromServer() {
        fetch(STATUS_URL)
        .then(res => res.json())
        .then(data => {
            if (!cardsContainer) return;
            cardsContainer.innerHTML = '';

            const cards = data.cards || [];
            if (cards.length === 0) {
                cardsContainer.innerHTML = '<div style="color:rgba(255,255,255,0.4); font-family:\'Neulis Sans\'; font-weight:700; font-size:18px; text-align:center; width:100%; padding:40px;">No cards loaded. Open Admin panel to add artists.</div>';
                return;
            }

            cards.forEach((card, index) => {
                const delay = (index + 1) * 0.1;
                const cardHTML = `
                    <div class="card" data-id="${card.id}" style="animation-delay: ${delay}s;">
                        <div class="card__image" style="background-image: url('${card.image || 'images/default.png'}')"></div>
                        <div class="card__info">
                            <div class="card__artist">${card.artist}</div>
                            <div class="card__music">${card.music}</div>
                            <div class="card__country">${card.country}</div>
                        </div>
                        <div class="vote-control">
                            <button class="vote-btn btn-minus" disabled>−</button>
                            <span class="vote-amount">0</span>
                            <button class="vote-btn btn-plus">+</button>
                        </div>
                    </div>
                `;
                cardsContainer.insertAdjacentHTML('beforeend', cardHTML);
            });
            updateTotalUI();
        });
    }

    // Синхронизация режимов
    function checkSystemStatus() {
        fetch(STATUS_URL)
        .then(res => res.json())
        .then(data => {
            currentSystemStatus = data.status;
            const controls = document.querySelectorAll('.vote-control');

            if (currentSystemStatus === 'open') {
                statusBar.style.display = 'none';
                controls.forEach(c => c.classList.remove('disabled-overlay'));
                if (headerCartBtn) {
                    headerCartBtn.style.display = 'flex';
                    headerCartBtn.style.pointerEvents = 'auto';
                    headerCartBtn.innerHTML = `<svg class="cart-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><span id="cart-count">${totalVotes}</span>`;
                }
            } 
            else if (currentSystemStatus === 'paused') {
                statusBar.style.display = 'block';
                statusBar.textContent = '⚠️ Voting is temporarily suspended';
                statusBar.style.background = 'rgba(255, 152, 0, 0.2)';
                statusBar.style.borderColor = 'rgba(255, 152, 0, 0.4)';
                controls.forEach(c => c.classList.add('disabled-overlay'));
                closeCart();
            } 
            else if (currentSystemStatus === 'closed') {
                statusBar.style.display = 'block';
                statusBar.textContent = '⛔ Voting is officially closed';
                statusBar.style.background = 'rgba(233, 30, 99, 0.2)';
                statusBar.style.borderColor = 'rgba(233, 30, 99, 0.4)';
                controls.forEach(c => c.classList.add('disabled-overlay'));
                closeCart();
                
                if (headerCartBtn) {
                    headerCartBtn.innerHTML = `📊 <span style="font-size:13px; font-weight:700;">Final Results</span>`;
                    headerCartBtn.style.pointerEvents = 'auto';
                    headerCartBtn.onclick = (e) => {
                        e.stopPropagation();
                        showPublicFinalResults(data.totalScores, data.cards || []);
                    };
                }
            }
        }).catch(() => {});
    }

    setInterval(checkSystemStatus, 3000);
    loadCardsFromServer();
    checkSystemStatus();

    function showPublicFinalResults(scores, cards) {
        if (resultsList) resultsList.innerHTML = '';
        if (resultsTitle) resultsTitle.textContent = 'Official Eurovision Results 🏆';
        
        const artistMap = {};
        cards.forEach(c => { artistMap[c.id] = c.artist; });

        const sorted = Object.entries(scores).sort((a,b) => b - a);
        if(sorted.length === 0) resultsList.innerHTML = '<p style="text-align:center;opacity:0.5;font-size:14px;padding:20px;">No votes recorded.</p>';
        
        sorted.forEach(([id, val]) => {
            resultsList.insertAdjacentHTML('beforeend', `<div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; font-size:14px;"><span>${artistMap[id] || 'Artist'}</span><strong>${val} points</strong></div>`);
        });
        
        const closeBtn = document.getElementById('close-results-btn');
        if(closeBtn) closeBtn.textContent = 'Close Window';
        if (resultsModal) { resultsModal.style.opacity = '1'; resultsModal.style.pointerEvents = 'auto'; }
    }

    // Вызов админки строго по Ctrl + M
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            adminModal.classList.add('active');
            renderLoginForm();
        }
    });

    if (closeAdminBtn) closeAdminBtn.addEventListener('click', () => adminModal.classList.remove('active'));

    function renderLoginForm() {
        if (adminModalTitle) adminModalTitle.textContent = 'Admin Authorization 🔐';
        adminMainBody.innerHTML = `
            <div style="display:flex; flex-direction:column;">
                <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin: 0 0 8px 0;">Enter secure dashboard key:</p>
                <input type="password" id="admin-password-input" class="admin-input-v2" placeholder="Password">
                <button id="admin-login-trigger-btn" class="admin-btn-v2">Sign In</button>
            </div>
        `;
        const loginBtn = document.getElementById('admin-login-trigger-btn');
        const passwordInput = document.getElementById('admin-password-input');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const password = passwordInput.value;
                fetch(LOGIN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: password })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        currentAdminPassword = password;
                        loadAdminStats();
                    } else {
                        alert(data.message);
                    }
                }).catch(() => alert('Сервер выключен! Запустите node server.js в терминале.'));
            });
        }
    }

    function loadAdminStats() {
        fetch(ADMIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: currentAdminPassword })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (adminModalTitle) adminModalTitle.textContent = 'Dashboard Control Panel 📊';
                
                adminMainBody.innerHTML = `
                    <p style="font-size:12px; opacity:0.6; margin:0 0 5px 0;">Switch Voting Mode:</p>
                    <div class="admin-status-nav">
                        <button class="status-nav-btn ${data.status==='open'?'active':''}" data-status="open">OPEN</button>
                        <button class="status-nav-btn ${data.status==='paused'?'active':''}" data-status="paused">PAUSE</button>
                        <button class="status-nav-btn ${data.status==='closed'?'active':''}" data-status="closed">CLOSE</button>
                    </div>

                    <!-- КНОПКА ПОЛНОГО СБРОСА ГОЛОСОВ И БАНОВ -->
                    <div style="margin-bottom: 15px;">
                        <button id="admin-reset-database-btn" class="admin-btn-v2" style="background:#ff5252; color:#fff; font-weight:700;">🔥 Reset All Votes & IP Ban</button>
                    </div>

                    <p style="font-size:12px; opacity:0.6; margin:10px 0 5px 0;">Add New Artist Card:</p>
                    <div style="display:flex; flex-direction:column; gap:6px; background:rgba(255,255,255,0.03); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.05); margin-bottom:15px;">
                        <input type="text" id="add-artist" class="admin-input-v2" placeholder="Artist Name" style="margin:0;">
                        <input type="text" id="add-music" class="admin-input-v2" placeholder="Song Title" style="margin:0;">
                        <input type="text" id="add-country" class="admin-input-v2" placeholder="Country" style="margin:0;">
                        <input type="text" id="add-image" class="admin-input-v2" placeholder="Image URL (e.g. images/1.webp)" style="margin:0;">
                        <button id="admin-add-card-btn" class="admin-btn-v2" style="background:#4caf50; color:#fff; margin:0;">Add Card</button>
                    </div>
                    <p style="font-size:12px; color:rgba(255,255,255,0.6); margin:0 0 10px 0;">Total unique voters: ${data.totalVoters}</p>
                    <div id="admin-leaderboard" style="max-height:160px; overflow-y:auto; margin-bottom:15px;"></div>
                    <button id="admin-logout-btn" class="admin-btn-v2" style="background:rgba(255,255,255,0.06); color:#fff; border:1px solid rgba(255,255,255,0.1); margin:0;">Close Panel</button>
                `;

                // Обработчик кнопки ПОЛНОГО СБРОСА
                document.getElementById('admin-reset-database-btn').addEventListener('click', () => {
                    if (!confirm('ВНИМАНИЕ! Это полностью обнулит все набранные голоса на сервере и сотрет черные списки IP. Карточки останутся. Продолжить?')) return;

                    fetch(RESET_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: currentAdminPassword })
                    })
                    .then(res => res.json())
                    .then(resData => {
                        if (resData.success) {
                            alert(resData.message);
                            loadAdminStats();
                            loadCardsFromServer();
                        }
                    });
                });

                // Обработчик добавления карточки
                document.getElementById('admin-add-card-btn').addEventListener('click', () => {
                    const artist = document.getElementById('add-artist').value;
                    const music = document.getElementById('add-music').value;
                    const country = document.getElementById('add-country').value;
                    const image = document.getElementById('add-image').value;

                    if (!artist || !music || !country) return alert('Fill in fields!');

                    fetch(CARDS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            password: currentAdminPassword,
                            action: 'add',
                            cardData: { artist, music, country, image }
                        })
                    })
                    .then(res => res.json())
                    .then(resData => {
                        if (resData.success) {
                            loadAdminStats();
                            loadCardsFromServer();
                        }
                    });
                });

                // Переключатели режимов
                document.querySelectorAll('.status-nav-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const statusToSet = btn.getAttribute('data-status');
                        fetch(CHANGE_STATUS_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: currentAdminPassword, newStatus: statusToSet })
                        })
                        .then(res => res.json())
                        .then(resData => {
                            if (resData.success) {
                                document.querySelectorAll('.status-nav-btn').forEach(b => b.classList.remove('active'));
                                btn.classList.add('active');
                                checkSystemStatus();
                            }
                        });
                    });
                });

                const adminLeaderboard = document.getElementById('admin-leaderboard');
                if (document.getElementById('admin-logout-btn')) {
                    document.getElementById('admin-logout-btn').addEventListener('click', () => adminModal.classList.remove('active'));
                }

                const cardsList = data.cards || [];
                adminLeaderboard.innerHTML = '';
                cardsList.forEach(c => {
                    const votes = data.totalScores[c.id] || 0;
                    adminLeaderboard.insertAdjacentHTML('beforeend', `
                        <div class="admin-row-v2">
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:700; font-size:14px;">${c.artist}</span>
                                <small style="font-size:10px; opacity:0.5;">${votes} votes</small>
                            </div>
                            <button class="delete-card-trigger" data-id="${c.id}" style="background:#ff5252; color:#fff; border:none; padding:4px 8px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:bold;">Del</button>
                        </div>
                    `);
                });

                document.querySelectorAll('.delete-card-trigger').forEach(delBtn => {
                    delBtn.addEventListener('click', () => {
                        const idToDelete = delBtn.getAttribute('data-id');
                        if (!confirm('Delete this artist?')) return;

                        fetch(CARDS_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                password: currentAdminPassword,
                                action: 'delete',
                                cardId: idToDelete
                            })
                        })
                        .then(res => res.json())
                        .then(resData => {
                            if (resData.success) {
                                loadAdminStats();
                                loadCardsFromServer();
                            }
                        });
                    });
                });
            }
        });
    }

    // --- ФУНКЦИОНАЛ КОРЗИНЫ ---
    const modalHTML = `
        <div id="results-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,10,12,0.8);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);display:flex;align-items:center;justify-content:center;z-index:1000;opacity:0;pointer-events:none;transition:opacity 0.3s ease;">
            <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:30px;width:90%;max-width:450px;color:#ffffff;text-align:center;">
                <div id="results-title" style="font-size:22px;font-weight:700;margin-bottom:15px;">Votes Submitted! 🎉</div>
                <div id="results-list" style="text-align:left;margin:20px 0;max-height:240px;overflow-y:auto;font-size:14px;"></div>
                <button id="close-results-btn" style="background:#ffffff;color:#111116;border:none;padding:12px 30px;border-radius:20px;font-weight:700;font-size:14px;cursor:pointer;width:100%;">Vote Again</button>
            </div>
        </div>
    `;
    const oldModal = document.getElementById('results-modal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const resultsModal = document.getElementById('results-modal');
    const presidentialTitle = document.getElementById('results-title');
    const resultsList = document.getElementById('results-list');
    const closeResultsBtn = document.getElementById('close-results-btn');

    if (headerCartBtn) {
        headerCartBtn.addEventListener('click', () => {
            if (currentSystemStatus !== 'open') return; 
            updateSidebarList();
            cartSidebar.classList.add('open');
            cartOverlay.classList.add('open');
        });
    }

    const closeCart = () => {
        if (cartSidebar) cartSidebar.classList.remove('open');
        if (cartOverlay) cartOverlay.classList.remove('open');
    };

    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    function updateSidebarList() {
        if (!cartSidebarList) return;
        cartSidebarList.innerHTML = '';
        let hasItems = false;

        document.querySelectorAll('.card').forEach(card => {
            const amountEl = card.querySelector('.vote-amount');
            const votes = parseInt(amountEl.textContent, 10) || 0;

            if (votes > 0) {
                hasItems = true;
                const artist = card.querySelector('.card__artist').textContent;
                const country = card.querySelector('.card__country').textContent;

                const row = document.createElement('div');
                row.className = 'cart-item-row';
                row.innerHTML = `
                    <div class="cart-item-row__info">
                        <span class="cart-item-row__artist">${artist}</span>
                        <span class="cart-item-row__country">${country}</span>
                    </div>
                    <div class="cart-item-row__badge">${votes} ${votes === 1 ? 'vote' : 'votes'}</div>
                `;
                cartSidebarList.appendChild(row);
            }
        });

        if (!hasItems) {
            cartSidebarList.innerHTML = '<div class="cart-sidebar__empty">Your shopping cart is empty.</div>';
            if (sidebarSubmitBtn) sidebarSubmitBtn.disabled = true;
        } else {
            if (sidebarSubmitBtn) sidebarSubmitBtn.disabled = false;
        }
        if (sidebarTotalCount) sidebarTotalCount.textContent = totalVotes;
    }

    function updateTotalUI() {
        const liveCountSpan = document.getElementById('cart-count');
        if (liveCountSpan && currentSystemStatus === 'open') liveCountSpan.textContent = totalVotes;
        if (cartSidebar && cartSidebar.classList.contains('open')) updateSidebarList();
    }

    function animateDigitChange(amountEl, newValue) {
        if (amountEl.animationTimeout) clearTimeout(amountEl.animationTimeout);
        let currentDisplayed = amountEl.textContent.trim();
        const activeSpan = amountEl.querySelector('.slide-in');
        if (activeSpan) currentDisplayed = activeSpan.textContent.trim();
        if (currentDisplayed === String(newValue)) { amountEl.textContent = newValue; return; }

        amountEl.innerHTML = '';
        const oldDigit = document.createElement('span');
        oldDigit.className = 'vote-digit slide-out';
        oldDigit.textContent = currentDisplayed;
        const newDigit = document.createElement('span');
        newDigit.className = 'vote-digit slide-in';
        newDigit.textContent = newValue;
        amountEl.appendChild(oldDigit);
        amountEl.appendChild(newDigit);

        amountEl.animationTimeout = setTimeout(() => {
            amountEl.textContent = newValue;
            amountEl.animationTimeout = null;
        }, 220);
    }

    // Обработчик кликов на карточки (делегирование на контейнер)
    if (cardsContainer) {
        cardsContainer.addEventListener('click', (e) => {
            if (currentSystemStatus !== 'open') return; 
            const target = e.target;

            const plusBtn = target.closest('.btn-plus');
            const minusBtn = target.closest('.btn-minus');
            const voteControl = target.closest('.vote-control');
            
            if (!voteControl) return;

            const amountEl = voteControl.querySelector('.vote-amount');
            const currentMinusBtn = voteControl.querySelector('.btn-minus');
            
            let currentVotes = 0;
            const activeSpan = amountEl.querySelector('.slide-in');
            if (activeSpan) currentVotes = parseInt(activeSpan.textContent, 10) || 0;
            else currentVotes = parseInt(amountEl.textContent, 10) || 0;

            if (plusBtn || currentVotes === 0) {
                if (minusBtn) return; 
                if (totalVotes >= MAX_TOTAL_VOTES) return alert('Maximum 20 votes allowed!');
                
                currentVotes += 1;
                totalVotes += 1;
                voteControl.classList.add('active');
                animateDigitChange(amountEl, currentVotes);
                if (currentMinusBtn) currentMinusBtn.removeAttribute('disabled');
                updateTotalUI();
                return;
            }

            if (minusBtn) {
                if (currentVotes > 0) {
                    currentVotes -= 1;
                    totalVotes -= 1;
                    animateDigitChange(amountEl, currentVotes);
                    if (currentVotes === 0) {
                        voteControl.classList.remove('active');
                        if (currentMinusBtn) currentMinusBtn.setAttribute('disabled', 'true');
                    }
                    updateTotalUI();
                }
            }
        });
    }

    if (sidebarSubmitBtn) {
        sidebarSubmitBtn.addEventListener('click', () => {
            if (totalVotes === 0 || currentSystemStatus !== 'open') return;
            const originalText = sidebarSubmitBtn.textContent;
            sidebarSubmitBtn.textContent = 'Sending...';

            const votesPayload = [];
            document.querySelectorAll('.card').forEach(card => {
                const artistId = card.getAttribute('data-id');
                const votesCount = parseInt(card.querySelector('.vote-amount').textContent, 10) || 0;
                if (votesCount > 0) votesPayload.push({ artistId: artistId, count: votesCount });
            });

            fetch(SERVER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ votes: votesPayload })
            })
            .then(res => res.json())
            .then(data => {
                sidebarSubmitBtn.textContent = originalText;
                closeCart();
                if (resultsList) resultsList.innerHTML = '';

                if (data.success) {
                    if (presidentialTitle) presidentialTitle.textContent = 'Votes Submitted! 🎉';
                    document.querySelectorAll('.card').forEach(card => {
                        const votes = parseInt(card.querySelector('.vote-amount').textContent, 10) || 0;
                        if (votes > 0) {
                            resultsList.insertAdjacentHTML('beforeend', `<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;"><span>${card.querySelector('.card__artist').textContent}</span><strong>${votes} v.</strong></div>`);
                        }
                    });
                } else {
                    if (presidentialTitle) presidentialTitle.textContent = 'Access Denied ❌';
                    resultsList.innerHTML = `<p style="color:#ff5252; text-align:center; font-weight:700;">${data.message}</p>`;
                }
                if (resultsModal) { resultsModal.style.opacity = '1'; resultsModal.style.pointerEvents = 'auto'; }
            })
            .catch(() => {
                sidebarSubmitBtn.textContent = originalText;
                closeCart();
                if (presidentialTitle) presidentialTitle.textContent = 'Votes Submitted! (Local) 🎉';
                if (resultsModal) { resultsModal.style.opacity = '1'; resultsModal.style.pointerEvents = 'auto'; }
            });
        });
    }

    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', () => {
            if (resultsModal) { resultsModal.style.opacity = '0'; resultsModal.style.pointerEvents = 'none'; }
            if (currentSystemStatus === 'open') resetAllVotes();
        });
    }
});

