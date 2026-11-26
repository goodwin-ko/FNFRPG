// FNF RPG J Character Analyzer - Frontend JS Logic

// Global states
let itemDatabase = {}; // Loaded from items.json
let userCustomMappings = {}; // Loaded from localStorage
let currentSearchData = []; // Full list of slots for current search
let activeSlotIndex = 0; // Index of the currently visible slot
let activeBagIndex = 1; // Currently selected bag number (1-8)

// DOM Elements
const searchForm = document.getElementById('searchForm');
const nicNameInput = document.getElementById('nicNameInput');
const searchBtn = document.getElementById('searchBtn');
const rankingBody = document.getElementById('rankingBody');
const welcomeScreen = document.getElementById('welcomeScreen');
const loadingScreen = document.getElementById('loadingScreen');
const errorScreen = document.getElementById('errorScreen');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const dashboardContent = document.getElementById('dashboardContent');

// Profile Header Elements
const profileName = document.getElementById('profileName');
const profileSaveDate = document.getElementById('profileSaveDate');
const slotSelector = document.getElementById('slotSelector');

// Stats Elements
const statGold = document.getElementById('statGold');
const statWood = document.getElementById('statWood');
const statStr = document.getElementById('statStr');
const statAgi = document.getElementById('statAgi');
const statInt = document.getElementById('statInt');
const statHeroExp = document.getElementById('statHeroExp');
const statPetAgi = document.getElementById('statPetAgi');
const statPetInt = document.getElementById('statPetInt');
const statPetExp = document.getElementById('statPetExp');
const heroTypeCode = document.getElementById('heroTypeCode');
const heroTypeName = document.getElementById('heroTypeName');
const petTypeCode = document.getElementById('petTypeCode');
const petTypeName = document.getElementById('petTypeName');

// Inventory & Bags Elements
const heroInventoryGrid = document.getElementById('heroInventoryGrid');
const bagTabs = document.getElementById('bagTabs');
const activeBagName = document.getElementById('activeBagName');
const activeBagCode = document.getElementById('activeBagCode');
const bagInventoryGrid = document.getElementById('bagInventoryGrid');

// JSON Viewer Elements
const rawJsonWrapper = document.getElementById('rawJsonWrapper');
const rawJsonCode = document.getElementById('rawJsonCode');
const jsonToggleIcon = document.getElementById('jsonToggleIcon');

// Modal Elements
const editModal = document.getElementById('editModal');
const modalRawInt = document.getElementById('modalRawInt');
const modalRawCode = document.getElementById('modalRawCode');
const modalDefaultName = document.getElementById('modalDefaultName');
const modalCustomName = document.getElementById('modalCustomName');
let editingItemData = null; // Holds reference to currently edited item

// Initialize App
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Custom Local Mapping
    loadCustomMappings();

    // 2. Load Item Database (items.json)
    try {
        const response = await fetch('/items.json');
        if (response.ok) {
            itemDatabase = await response.json();
            console.log(`Loaded ${Object.keys(itemDatabase).length} item definitions.`);
        }
    } catch (e) {
        console.error('Failed to load item database', e);
    }

    // 3. Load Patch Info, Rankings & Event Logs
    loadPatchInfo();
    await loadRankings();
    loadEventLogs();
    
    // Bind Sidebar Tabs
    const tabRankings = document.getElementById('tabRankings');
    const tabEventLogs = document.getElementById('tabEventLogs');
    const tabGameInfo = document.getElementById('tabGameInfo');
    const panelRankings = document.getElementById('panelRankings');
    const panelEventLogs = document.getElementById('panelEventLogs');
    const panelGameInfo = document.getElementById('panelGameInfo');
    
    const activateSidebarTab = (target) => {
        [tabRankings, tabEventLogs, tabGameInfo].forEach(b => b && b.classList.remove('active'));
        [panelRankings, panelEventLogs, panelGameInfo].forEach(p => p && p.classList.add('hidden'));
        if (target === 'rankings') {
            tabRankings && tabRankings.classList.add('active');
            panelRankings && panelRankings.classList.remove('hidden');
        } else if (target === 'logs') {
            tabEventLogs && tabEventLogs.classList.add('active');
            panelEventLogs && panelEventLogs.classList.remove('hidden');
            loadEventLogs();
        } else if (target === 'info') {
            tabGameInfo && tabGameInfo.classList.add('active');
            panelGameInfo && panelGameInfo.classList.remove('hidden');
            renderGameInfo();
        }
    };

    if (tabRankings) tabRankings.addEventListener('click', () => activateSidebarTab('rankings'));
    if (tabEventLogs) tabEventLogs.addEventListener('click', () => activateSidebarTab('logs'));
    if (tabGameInfo) tabGameInfo.addEventListener('click', () => activateSidebarTab('info'));
    
    // 4. Bind Search Form Submit
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const queryName = nicNameInput.value.trim();
        if (queryName) {
            searchUser(queryName);
        }
    });

    // 5. Initialize Mobile Tabs
    initMobileTabs();
});

// Helper: Compact format for large numbers in rankings table
function formatCompactNum(num) {
    const n = Number(num) || 0;
    if (n === 0) return '0';
    if (n >= 100000000) return (n / 100000000).toFixed(2).replace(/\.00$/, '') + '억';
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '만';
    return n.toLocaleString();
}

// Load rankings from backend API
async function loadRankings() {
    try {
        const response = await fetch('/api/rankings?t=' + Date.now());
        if (!response.ok) throw new Error('API response error');
        
        const ranks = await response.json();
        rankingBody.innerHTML = '';
        
        if (ranks.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">랭킹 데이터가 없습니다.</td></tr>';
            return;
        }

        ranks.forEach(player => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-name', player.nicname);
            
            const rankNum = parseInt(player.rank);
            if (rankNum <= 10) {
                tr.classList.add('top-10-row');
            }
            
            let badgeHtml = '';
            const tierMap = {
                1: { name: '챌린저', key: 'challenger' },
                2: { name: '그랜드마스터', key: 'grandmaster' },
                3: { name: '마스터', key: 'master' },
                4: { name: '다이아몬드', key: 'diamond' },
                5: { name: '에메랄드', key: 'emerald' },
                6: { name: '플래티넘', key: 'platinum' },
                7: { name: '골드', key: 'gold' },
                8: { name: '실버', key: 'silver' },
                9: { name: '브론즈', key: 'bronze' },
                10: { name: '아이언', key: 'iron' }
            };
            
            if (rankNum <= 10) {
                const tier = tierMap[rankNum];
                const imgUrl = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier.key}.png`;
                badgeHtml = `
                    <div class="lol-badge-container tier-${tier.key}" title="${rankNum}등: ${tier.name}">
                        <img src="${imgUrl}" class="lol-badge-icon" alt="${tier.name}">
                        <span class="lol-badge-text">${rankNum}</span>
                    </div>
                `;
            } else {
                badgeHtml = `<span class="rank-badge rank-other">${rankNum}</span>`;
            }

            const scoreVal = Number(player.score) || 0;
            const vipVal = Number(player.vip) || 0;
            const suryeonVal = Number(player.suryeon) || 0;
            const bankVal = Number(player.bank) || 0;
            const powerVal = Number(player.power) || 0;
            const statueVal = Number(player.statue) || 0;
            const fairyVal = Number(player.fairy) || 0;
            const petVal = Number(player.pet) || 0;
            const funcoreVal = Number(player.funcore) || 0;
                               
            tr.innerHTML = `
                <td>${badgeHtml}</td>
                <td><div class="rank-name" title="${player.nicname}">${player.nicname}</div></td>
                <td><span class="rank-score" title="${scoreVal.toLocaleString()}">${formatCompactNum(scoreVal)}</span></td>
                <td class="rank-stat-cell rank-funcore-cell" title="${funcoreVal.toLocaleString()}">${funcoreVal > 10000 ? formatCompactNum(funcoreVal) : funcoreVal.toLocaleString()}</td>
                <td class="rank-stat-cell rank-vip-cell">${vipVal}</td>
                <td class="rank-stat-cell" title="${suryeonVal.toLocaleString()}">${formatCompactNum(suryeonVal)}</td>
                <td class="rank-stat-cell" title="${bankVal.toLocaleString()}">${formatCompactNum(bankVal)}</td>
                <td class="rank-stat-cell rank-power-cell">${powerVal}</td>
                <td class="rank-stat-cell">${statueVal}</td>
                <td class="rank-stat-cell">${fairyVal}</td>
                <td class="rank-stat-cell rank-pet-cell">${petVal}</td>
            `;
            
            tr.addEventListener('click', () => {
                nicNameInput.value = player.nicname;
                searchUser(player.nicname);
            });
            
            rankingBody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error loading rankings', e);
        rankingBody.innerHTML = '<tr><td colspan="11" class="text-center text-muted"><i class="fa-solid fa-triangle-exclamation"></i> 불러오기 실패</td></tr>';
    }
}

// Load Event Logs from backend API
async function loadEventLogs() {
    const eventLogsList = document.getElementById('eventLogsList');
    if (!eventLogsList) return;
    
    try {
        const response = await fetch('/api/eventlog?t=' + Date.now());
        if (!response.ok) throw new Error('API response error');
        
        const logs = await response.json();
        eventLogsList.innerHTML = '';
        
        if (logs.length === 0) {
            eventLogsList.innerHTML = '<div class="text-center text-muted py-4">최근 이벤트 로그가 없습니다.</div>';
            return;
        }

        logs.forEach(log => {
            const item = document.createElement('div');
            item.className = 'event-log-item';
            
            item.innerHTML = `
                <div class="event-log-meta">
                    <span style="font-weight:600;color:var(--purple);"><i class="fa-solid fa-clipboard-list"></i> 로그 알림</span>
                    <span>${log.date}</span>
                </div>
                <div class="event-log-msg">${log.msg}</div>
            `;
            
            item.addEventListener('click', () => {
                const parts = log.msg.trim().split(/\s+/);
                if (parts.length > 0) {
                    const nickname = parts[0];
                    nicNameInput.value = nickname;
                    searchUser(nickname);
                }
            });
            
            eventLogsList.appendChild(item);
        });
    } catch (e) {
        console.error('Error loading event logs', e);
        eventLogsList.innerHTML = '<div class="text-center text-muted py-4"><i class="fa-solid fa-triangle-exclamation"></i> 불러오기 실패</div>';
    }
}

// Search user by nickname
async function searchUser(nicname) {
    showScreen('loading');
    highlightActiveRank(nicname);

    try {
        const response = await fetch(`/api/search?nicName=${encodeURIComponent(nicname)}`);
        if (!response.ok) {
            throw new Error('M16Tool에서 데이터를 가져오는데 실패했습니다.');
        }
        
        const data = await response.json();
        if (data.length === 0) {
            showError('검색 결과 없음', `닉네임 "<strong>${escapeHtml(nicname)}</strong>"에 해당하는 FNF RPG J 세이브 데이터가 존재하지 않습니다.<br>아이디를 정확하게 입력했는지 확인해 보세요.`);
            return;
        }

        currentSearchData = data;
        activeSlotIndex = 0;
        activeBagIndex = 1;
        
        showScreen('dashboard');
        renderProfileHeader();
        renderSlotSelector();
        renderActiveSlot();
        
        // Auto-switch mobile tab to Search view
        const tabBtnSearch = document.getElementById('tabBtnSearch');
        if (tabBtnSearch) {
            tabBtnSearch.click();
        }

    } catch (e) {
        console.error(e);
        showError('서버 연결 오류', e.message || 'M16Tool 웹 사이트 응답을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
}

// Helper: Highlight active user in ranking list
function highlightActiveRank(nicname) {
    const rows = rankingBody.querySelectorAll('tr');
    rows.forEach(row => {
        if (row.getAttribute('data-name') === nicname) {
            row.classList.add('active-rank');
        } else {
            row.classList.remove('active-rank');
        }
    });
}

// Render Slot Tabs selector
function renderSlotSelector() {
    slotSelector.innerHTML = '';
    currentSearchData.forEach((slotData, index) => {
        const btn = document.createElement('button');
        btn.className = `slot-btn ${index === activeSlotIndex ? 'active-slot' : ''}`;
        
        // Let's decide icon
        let icon = '<i class="fa-solid fa-gamepad"></i>';
        if (slotData.slot === 'RkData') icon = '<i class="fa-solid fa-trophy text-warning"></i>';
        
        btn.innerHTML = `${icon} Slot: ${slotData.slot}`;
        btn.addEventListener('click', () => {
            activeSlotIndex = index;
            // Reset active bag to 1 when changing slots
            activeBagIndex = 1;
            
            // Update buttons active class
            slotSelector.querySelectorAll('.slot-btn').forEach((b, idx) => {
                b.className = `slot-btn ${idx === activeSlotIndex ? 'active-slot' : ''}`;
            });
            
            renderActiveSlot();
        });
        
        slotSelector.appendChild(btn);
    });
}

// Render top-level profile information
function renderProfileHeader() {
    const firstData = currentSearchData[0];
    profileName.textContent = firstData.data.ID || nicNameInput.value;
}

// Render active slot contents
function renderActiveSlot() {
    const slotObj = currentSearchData[activeSlotIndex];
    if (!slotObj) return;

    const data = slotObj.data;
    
    // 1. Set save date
    profileSaveDate.textContent = formatSaveDate(slotObj.date);

    // 2. Core stats
    statGold.textContent = (data.Gd || 0).toLocaleString();
    statWood.textContent = (data.Lr || 0).toLocaleString();
    statStr.textContent = (data.hS || 0).toLocaleString();
    statAgi.textContent = (data.hA || 0).toLocaleString();
    statInt.textContent = (data.hI || 0).toLocaleString();
    statHeroExp.textContent = (data.hEx || 0).toLocaleString();
    statPetAgi.textContent = (data.pA || 0).toLocaleString();
    statPetInt.textContent = (data.pI || 0).toLocaleString();
    statPetExp.textContent = (data.pEx || 0).toLocaleString();

    // 3. Hero & Pet Types Rawcodes
    const heroCode = intToRawcode(data.hero);
    const petCode = intToRawcode(data.pet);
    
    heroTypeCode.textContent = heroCode || 'None';
    heroTypeName.textContent = getItemName(data.hero, heroCode, 0);
    
    petTypeCode.textContent = petCode || 'None';
    petTypeName.textContent = getItemName(data.pet, petCode, 0);

    // 3.5 Special Stats Summary Display (이만강, 수련치, VIP, 정수뱅크, 정수코인, 정신력, 정력, 별성, 펫 등급, 요정 레벨, 무한의 탑, 동상, 후포, 빙고P, 가방)
    const specialStatsBar = document.getElementById('specialStatsBar');
    if (specialStatsBar) {
        specialStatsBar.innerHTML = '';
        
        const logStats = slotObj.log_stats || {};

        // Find counts (Prioritize p* direct properties from latest map update)
        const cntImangang = data.pRank !== undefined ? data.pRank : findItemCount(data, 1227895602);
        const cntSuryeonchi = data.pSooryun !== undefined ? data.pSooryun : findItemCount(data, 776548403);
        const cntVip = data.pVIP !== undefined ? data.pVIP : findItemCount(data, 1227902280);
        const cntJeongsuBank = data.pBank !== undefined ? data.pBank : findItemCount(data, 1227896147);
        const cntCoin = data.pCoin !== undefined ? data.pCoin : (logStats.coin !== undefined ? logStats.coin : 0);
        const cntJeonsinryeok = data.pMental !== undefined ? data.pMental : findItemCount(data, 1227901528);
        const cntJeongryeok = data.pPower !== undefined ? data.pPower : findItemCount(data, 1227903062);
        const cntBingo = data.pBpoint !== undefined ? data.pBpoint : findItemCount(data, 1227902296);
        
        // pLDATA is now a date (YYYYMMDD >= 20000000) in latest patch, only use as DP if < 20000000
        const cntDp = (data.pLDATA !== undefined && data.pLDATA < 20000000)
            ? data.pLDATA
            : ((logStats.dp !== undefined) ? logStats.dp : findItemCount(data, 1227903799));
        const cntTower = data.pTFloor !== undefined ? data.pTFloor : (logStats.tower_floor !== undefined ? logStats.tower_floor : 0);
        const cntStatue = data.pStatue !== undefined ? data.pStatue : ((logStats.statue !== undefined) ? logStats.statue : findItemCount(data, 1227903800));
        
        // 후포 (Title/Hupo: p* priority -> Log parsing -> item count)
        let cntHupo = 0;
        if (data.pHpoint !== undefined) {
            cntHupo = data.pHpoint;
        } else if (logStats.hupo !== undefined) {
            cntHupo = logStats.hupo;
        } else if (data.log_hupo !== undefined) {
            cntHupo = data.log_hupo;
        } else {
            cntHupo = findItemCount(data, 1227905074);
            if (cntHupo === 0) {
                for (let s = 1; s <= 6; s++) if (data[`hi${s}`] === 1227905074) cntHupo = 10;
                for (let b = 1; b <= 8; b++) {
                    for (let s = 1; s <= 6; s++) {
                        const ik = b === 1 ? `bi${s}` : `b${b}i${s}`;
                        if (data[ik] === 1227905074) cntHupo = 10;
                    }
                }
            }
        }
        
        // 별성 (Star Grade) calculation & mapping
        const cntStars = data.pStar !== undefined ? data.pStar : ((logStats.stars !== undefined) ? logStats.stars : findItemCount(data, 1227903310));
        const starInfo = getStarGradeInfo(cntStars);
        const starName = starInfo.name;
        const starColor = starInfo.color;

        // Pet Grade calculation
        let petGrade = 0;
        if (data.pPet !== undefined) {
            petGrade = data.pPet;
        } else if (logStats.pet_grade !== undefined) {
            petGrade = logStats.pet_grade;
        } else {
            const currentPetName = getItemName(data.pet, intToRawcode(data.pet));
            const petNumMatch = currentPetName.match(/\[(\d+)\]/);
            if (cntVip > 0 && (currentPetName.includes('☆') || currentPetName.includes('굳윈') || currentPetName.includes('gmal') || cntVip >= cntStars)) {
                petGrade = cntVip;
            } else if (petNumMatch) {
                petGrade = parseInt(petNumMatch[1]);
            } else if (cntStars > 0) {
                petGrade = cntStars;
            } else {
                petGrade = cntVip;
            }
        }
        
        // 요정 레벨 (Fairy Level)
        const cntFairy = data.pFairy !== undefined ? data.pFairy : ((logStats.fairy_level !== undefined) 
            ? logStats.fairy_level 
            : (data.log_fairy_level !== undefined ? data.log_fairy_level : findItemCount(data, 1227903044)));

        // Find bag skin (log priority -> pBag ID mapping -> equipped b6i1 slot -> 없음)
        let ownedBagName = '없음';
        if (logStats.bag_skin && logStats.bag_skin !== '없음' && !logStats.bag_skin.startsWith('영웅') && !logStats.bag_skin.startsWith('(')) {
            ownedBagName = logStats.bag_skin;
        } else if (data.log_bag_skin && data.log_bag_skin !== '없음' && !data.log_bag_skin.startsWith('영웅') && !data.log_bag_skin.startsWith('(')) {
            ownedBagName = data.log_bag_skin;
        } else if (data.pBag !== undefined && data.pBag > 0) {
            ownedBagName = getBagNameById(data.pBag);
        } else if (data.b6i1) {
            const b6Name = getItemName(data.b6i1, intToRawcode(data.b6i1));
            if ((b6Name.includes('가방') || b6Name.includes('풀백') || b6Name.includes('루미') || b6Name.includes('풀강') || b6Name.includes('보물')) && !b6Name.includes('미등록') && !b6Name.includes('알 수 없는') && !b6Name.startsWith('(')) {
                ownedBagName = b6Name;
            }
        }
        
        // Infinite Tower today completion check (pTDate === YYYYMMDD)
        const nowDate = new Date();
        const todayInt = nowDate.getFullYear() * 10000 + (nowDate.getMonth() + 1) * 100 + nowDate.getDate();
        const isTowerDoneToday = data.pTDate === todayInt;
        const towerText = cntTower > 0 ? `${cntTower}층` : '0층';
        const towerHtml = isTowerDoneToday
            ? `${towerText}<span class="tower-badge done">✓ 오늘완료</span>`
            : `${towerText}<span class="tower-badge pending">미완료</span>`;

        const specialList = [
            { label: '이만강', value: cntImangang.toLocaleString(), color: '#cbd5e1' },
            { label: '수련치', value: cntSuryeonchi.toLocaleString(), color: '#10b981' },
            { label: 'VIP', value: cntVip.toLocaleString(), color: '#fef08a' },
            { label: '정수뱅크', value: cntJeongsuBank.toLocaleString(), color: '#3b82f6' },
            { label: '정수코인', value: cntCoin.toLocaleString(), color: '#fbbf24' },
            { label: '정신력', value: cntJeonsinryeok.toLocaleString(), color: '#a855f7' },
            { label: '정력', value: cntJeongryeok.toLocaleString(), color: '#ef4444' },
            { label: '별성', value: starName, color: starColor },
            { label: '펫 등급', value: petGrade.toLocaleString(), color: '#f472b6' },
            { label: '요정 레벨', value: cntFairy.toLocaleString(), color: '#818cf8' },
            { label: '무한의 탑', value: towerText, valueHtml: towerHtml, color: '#38bdf8' },
            { label: '동상', value: cntStatue.toLocaleString(), color: '#10b981' },
            { label: '후포', value: cntHupo.toLocaleString(), color: '#c084fc' },
            { label: '빙고P', value: cntBingo.toLocaleString(), color: '#facc15' },
            { label: '가방', value: ownedBagName, color: '#0ea5e9' }
        ];
        if (cntDp > 0) {
            specialList.splice(10, 0, { label: 'DP[대륙]', value: cntDp.toLocaleString(), color: '#f97316' });
        }
        
        specialList.forEach(item => {
            const chip = document.createElement('div');
            chip.className = 'special-stat-chip';
            chip.innerHTML = `
                <span class="chip-label">${item.label}</span>
                <span class="chip-value" style="color: ${item.color}" title="${item.value}">${item.valueHtml || item.value}</span>
            `;
            specialStatsBar.appendChild(chip);
        });
    }

    // 3.8 Render Important Items Summary (above Hero/Bag Inventory)
    renderImportantItems(data);

    // 4. Hero Inventory Slots (6 slots)
    heroInventoryGrid.innerHTML = '';
    for (let s = 1; s <= 6; s++) {
        const itemCode = data[`hi${s}`] || 0;
        const itemCount = data[`h${s}c`] || 0;
        
        const slotEl = createInventorySlotElement(s, itemCode, itemCount, 'hero');
        heroInventoryGrid.appendChild(slotEl);
    }

    // 4.5 Bag 1 Inventory Slots (6 slots right below Hero Inventory)
    const bag1InventoryGrid = document.getElementById('bag1InventoryGrid');
    if (bag1InventoryGrid) {
        bag1InventoryGrid.innerHTML = '';
        for (let s = 1; s <= 6; s++) {
            const itemCode = data[`bi${s}`] || 0;
            const itemCount = data[`b1${s}c`] || data[`b${s}c`] || 0;
            
            const slotEl = createInventorySlotElement(s, itemCode, itemCount, 'bag-1');
            bag1InventoryGrid.appendChild(slotEl);
        }
    }

    // 5. Bag Tabs & Inventory (8 bags)
    renderBagTabs(data);
    renderBagInventory(data);

    // 6. Raw JSON Code block
    rawJsonCode.textContent = JSON.stringify(data, null, 2);
}

// Render tabs for 8 bags
function renderBagTabs(data) {
    bagTabs.innerHTML = '';
    const customBagTitles = {
        1: '가방 아이템',
        2: '스킬등록 NPC',
        3: '외형등록 NPC',
        4: '저장창고'
    };
    for (let b = 1; b <= 8; b++) {
        const bagKey = b === 1 ? 'b' : `b${b}`;
        const bagItemCode = data[bagKey];
        
        // Even if empty, render it but style empty/non-empty differently
        const btn = document.createElement('button');
        btn.className = `bag-btn ${b === activeBagIndex ? 'active-bag' : ''}`;
        
        const baseTitle = customBagTitles[b] || `${b}번 가방`;
        const bagName = getItemName(bagItemCode, intToRawcode(bagItemCode));
        const bagDisplayName = bagItemCode ? `${baseTitle} (${bagName})` : baseTitle;
        
        btn.innerHTML = `<i class="fa-solid fa-briefcase"></i> ${bagDisplayName}`;
        
        btn.addEventListener('click', () => {
            activeBagIndex = b;
            bagTabs.querySelectorAll('.bag-btn').forEach((button, idx) => {
                button.className = `bag-btn ${(idx + 1) === activeBagIndex ? 'active-bag' : ''}`;
            });
            renderBagInventory(data);
        });
        
        bagTabs.appendChild(btn);
    }
}

// Render slots for active bag
function renderBagInventory(data) {
    const b = activeBagIndex;
    const bagKey = b === 1 ? 'b' : `b${b}`;
    const bagItemCode = data[bagKey] || 0;
    const bagCodeStr = intToRawcode(bagItemCode);
    
    const customBagTitles = {
        1: '가방 아이템',
        2: '스킬등록 NPC',
        3: '외형등록 NPC',
        4: '저장창고'
    };
    const baseTitle = customBagTitles[b] || `가방 ${b}`;
    
    activeBagName.textContent = `${baseTitle} (${getItemName(bagItemCode, bagCodeStr)})`;
    activeBagCode.textContent = bagItemCode ? `${bagCodeStr} (${bagItemCode})` : '비어 있음';

    bagInventoryGrid.innerHTML = '';
    
    // Populate 6 slots for this bag
    for (let s = 1; s <= 6; s++) {
        let itemKey, countKey;
        if (b === 1) {
            itemKey = `bi${s}`;
            countKey = `b${s}c`;
        } else {
            itemKey = `b${b}i${s}`;
            countKey = `b${b}${s}c`;
        }
        
        const itemCode = data[itemKey] || 0;
        const itemCount = data[countKey] || 0;
        
        const slotEl = createInventorySlotElement(s, itemCode, itemCount, `bag-${b}`);
        bagInventoryGrid.appendChild(slotEl);
    }
}

// Helper: Create slot element for inventory grid
function createInventorySlotElement(slotNum, rawInt, count, origin) {
    const el = document.createElement('div');
    
    if (!rawInt || rawInt === 0) {
        el.className = 'item-slot empty-slot';
        el.innerHTML = `
            <span class="slot-number">#${slotNum}</span>
            <div class="empty-slot-icon">
                <i class="fa-solid fa-box-open"></i>
            </div>
            <div class="item-details">
                <span class="item-name text-muted">비어 있음</span>
            </div>
        `;
        return el;
    }

    const rawCode = intToRawcode(rawInt);
    const resolvedName = getItemName(rawInt, rawCode, count);
    const countBadge = count > 1 ? `<span class="item-badge-count">x${count}</span>` : '';

    el.className = 'item-slot';
    el.innerHTML = `
        <span class="slot-number">#${slotNum}</span>
        ${countBadge}
        <div class="item-details">
            <span class="item-rawcode">${rawCode || 'None'}</span>
            <span class="item-name" title="${resolvedName}">${resolvedName}</span>
        </div>
    `;

    // Click to open edit label modal
    el.addEventListener('click', () => {
        openEditModal(rawInt, rawCode, origin);
    });

    return el;
}

// Open Edit custom label Modal
function openEditModal(rawInt, rawCode, origin) {
    editingItemData = { rawInt, rawCode, origin };
    
    modalRawInt.textContent = rawInt;
    modalRawCode.textContent = rawCode || 'None';
    
    // Default name is the one loaded from items.json (or blank if none)
    const defaultName = itemDatabase[rawInt.toString()] || '';
    modalDefaultName.textContent = defaultName || '(매핑 데이터 없음)';
    
    // Custom name is what user entered in localStorage
    const currentCustom = userCustomMappings[rawInt.toString()] || '';
    modalCustomName.value = currentCustom;
    
    // Show Modal
    editModal.classList.remove('hidden');
    modalCustomName.focus();
}

// Close Modal
function closeModal() {
    editModal.classList.add('hidden');
    editingItemData = null;
}

// Save custom item label mapping to localStorage
function saveCustomLabel() {
    if (!editingItemData) return;
    
    const key = editingItemData.rawInt.toString();
    const newName = modalCustomName.value.trim();
    
    if (newName) {
        userCustomMappings[key] = newName;
    } else {
        delete userCustomMappings[key];
    }
    
    // Persist
    localStorage.setItem('fnf_rpg_custom_mappings', JSON.stringify(userCustomMappings));
    
    closeModal();
    
    // Re-render active slot to apply changes instantly!
    renderActiveSlot();
}

// Load Custom Mapping data from LocalStorage
function loadCustomMappings() {
    try {
        const stored = localStorage.getItem('fnf_rpg_custom_mappings');
        if (stored) {
            userCustomMappings = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load local custom mapping', e);
        userCustomMappings = {};
    }
}

// Core Translation Logic
function getItemName(rawInt, rawCode, count = 0) {
    if (!rawInt || rawInt === 0) return '비어 있음';
    
    const intStr = rawInt.toString();
    
    // Get the base name first
    let baseName = '';
    if (userCustomMappings[intStr]) {
        baseName = userCustomMappings[intStr];
    } else if (itemDatabase[intStr]) {
        baseName = itemDatabase[intStr];
    } else if (rawInt === 1227903823) {
        baseName = '강화의 룬';
    } else if (rawCode) {
        baseName = `미등록 아이템 [${rawCode}]`;
    } else {
        baseName = '알 수 없는 코드';
    }
    
    // If the base name contains "강화의 룬"
    if (baseName.includes('강화의 룬')) {
        if (count && count > 0) {
            return `강화의 룬 [${count}]`;
        }
        // Extract existing [x] from baseName if count is 0
        const match = baseName.match(/\[(\d+)\]/);
        if (match) {
            return `강화의 룬 [${match[1]}]`;
        }
        return '강화의 룬';
    }

    // If the base name contains "동상" or is code 1227903800
    if (baseName.includes('동상') || rawInt === 1227903800) {
        const lvl = count || 0;
        if (lvl > 0) {
            let option = '';
            if (lvl <= 3) {
                option = `-수련치 +${lvl}`;
            } else {
                const decVal = (lvl - 3) * 500;
                option = `-수련치 +${lvl},[-${decVal}]`;
            }
            return `동상[Lv.${lvl}]${option}`;
        }
        return '동상';
    }

    // If the base name contains "악세"
    if (baseName.includes('악세')) {
        if (count && count > 0) {
            return `악세[Lv.${count}]`;
        }
        const match = baseName.match(/\[(?:Lv\.)?(\d+)\]/);
        if (match) {
            return `악세[Lv.${match[1]}]`;
        }
        return baseName;
    }

    // If the base name contains "인피니티" (excluding 조합석)
    if (baseName.includes('인피니티') && !baseName.includes('조합석') && !baseName.includes('별성')) {
        if (count && count > 0) {
            return `인피니티[${count}]`;
        }
        const match = baseName.match(/\[(\d+)\]/);
        if (match) {
            return `인피니티[${match[1]}]`;
        }
        return baseName;
    }
    
    return baseName;
}

// Translate integer into Warcraft 3 rawcode string (4-byte string)
function intToRawcode(value) {
    if (!value || value === 0) return '';
    try {
        // Convert to big-endian bytes
        const char1 = String.fromCharCode((value >> 24) & 0xFF);
        const char2 = String.fromCharCode((value >> 16) & 0xFF);
        const char3 = String.fromCharCode((value >> 8) & 0xFF);
        const char4 = String.fromCharCode(value & 0xFF);
        
        const code = char1 + char2 + char3 + char4;
        
        // Ensure character string is printable ASCII
        if (/^[ -~]{4}$/.test(code)) {
            return code;
        }
        
        // Fallback to hex
        return '0x' + value.toString(16).toUpperCase();
    } catch (e) {
        return '';
    }
}

// Parse MM/DD/YYYY HH:MM:SS date to Korean YYYY년 MM월 DD일 HH시 MM분 SS초 format
function formatSaveDate(dateStr) {
    if (!dateStr) return '';
    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/;
    const match = dateStr.match(regex);
    if (match) {
        const month = match[1].padStart(2, '0');
        const day = match[2].padStart(2, '0');
        const year = match[3];
        const hour = match[4].padStart(2, '0');
        const minute = match[5].padStart(2, '0');
        const second = match[6] ? match[6].padStart(2, '0') : null;
        
        if (second) {
            return `${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분 ${second}초`;
        } else {
            return `${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분`;
        }
    }
    return dateStr;
}

// Screen management helper
function showScreen(screen) {
    welcomeScreen.classList.add('hidden');
    loadingScreen.classList.add('hidden');
    errorScreen.classList.add('hidden');
    dashboardContent.classList.add('hidden');

    if (screen === 'welcome') {
        welcomeScreen.classList.remove('hidden');
    } else if (screen === 'loading') {
        loadingScreen.classList.remove('hidden');
    } else if (screen === 'error') {
        errorScreen.classList.remove('hidden');
    } else if (screen === 'dashboard') {
        dashboardContent.classList.remove('hidden');
    }
}

// Show Error card
function showError(title, msg) {
    showScreen('error');
    errorTitle.textContent = title;
    errorMessage.innerHTML = msg;
}

// Reset App to home
function resetApp() {
    nicNameInput.value = '';
    showScreen('welcome');
    highlightActiveRank(null);
}

// Toggle Raw JSON viewer panel
function toggleRawJson() {
    rawJsonWrapper.classList.toggle('hidden');
    jsonToggleIcon.classList.toggle('rotate-180');
}

// Copy Raw JSON text to clipboard
function copyRawJson() {
    const codeText = rawJsonCode.textContent;
    navigator.clipboard.writeText(codeText)
        .then(() => {
            alert('JSON 데이터가 클립보드에 복사되었습니다.');
        })
        .catch(err => {
            console.error('Copy failed', err);
        });
}

// HTML Escaper helper
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Get Star Grade Info (1~100 tiers)
function getStarGradeInfo(count) {
    if (!count || count <= 0) return { name: '없음', color: '#a1a1aa' };
    
    const tiers = [
        { name: '노랑', color: '#eab308' },       // 1~5
        { name: '녹색', color: '#22c55e' },       // 6~10
        { name: '핑크', color: '#ec4899' },       // 11~15
        { name: '레드', color: '#ef4444' },       // 16~20
        { name: '퍼플', color: '#a855f7' },       // 21~25
        { name: '블루', color: '#3b82f6' },       // 26~30
        { name: '블랙', color: '#94a3b8' },       // 31~35
        { name: '화이트', color: '#f8fafc' },     // 36~40
        { name: '레인보우', color: '#f43f5e' },   // 41~45
        { name: '오리진', color: '#fb923c' },     // 46~50
        { name: '프리즘', color: '#38bdf8' },     // 51~55
        { name: '셀레스티얼', color: '#818cf8' }, // 56~60
        { name: '코스믹', color: '#c084fc' },     // 61~65
        { name: '인피니티', color: '#e879f9' },   // 66~70
        { name: '트레센던스', color: '#2dd4bf' }, // 71~75
        { name: '오메가', color: '#fb7185' },     // 76~80
        { name: '엑시움', color: '#facc15' },     // 81~85
        { name: '네메시스', color: '#f87171' },   // 86~90
        { name: '제네시스', color: '#60a5fa' },   // 91~95
        { name: '앱솔루트', color: '#c084fc' }    // 96~100
    ];
    
    const tierIdx = Math.min(Math.floor((count - 1) / 5), tiers.length - 1);
    const subLvl = ((count - 1) % 5) + 1;
    const tier = tiers[tierIdx];
    
    return {
        name: `${tier.name}${subLvl}[${count}성]`,
        color: tier.color
    };
}

// Helper to find total count of a specific item in inventory & bags
function findItemCount(data, itemId) {
    let total = 0;
    // Check hero inventory
    for (let s = 1; s <= 6; s++) {
        if (data[`hi${s}`] === itemId) {
            total += (data[`h${s}c`] || 0);
        }
    }
    // Check bags 1 to 8
    for (let b = 1; b <= 8; b++) {
        for (let s = 1; s <= 6; s++) {
            let itemKey, countKey;
            if (b === 1) {
                itemKey = `bi${s}`;
                countKey = `b${s}c`;
            } else {
                itemKey = `b${b}i${s}`;
                countKey = `b${b}${s}c`;
            }
            if (data[itemKey] === itemId) {
                total += (data[countKey] || 0);
            }
        }
    }
    return total;
}

// Helper to find all bag items player possesses in their inventory/bags (sorted by tier descending)
function findBagItems(data) {
    const found = [];
    const checkAndAdd = (itemCode) => {
        if (itemCode) {
            const name = getItemName(itemCode, intToRawcode(itemCode));
            if ((name.includes('가방') || name.includes('풀백') || name.includes('루미') || name.includes('풀강') || name.includes('보물')) && !name.includes('미등록') && !name.includes('알 수 없는')) {
                if (!found.includes(itemCode)) found.push(itemCode);
            }
        }
    };
    
    // Check equipped bag skin slot (b6i1) first
    if (data.b6i1) {
        checkAndAdd(data.b6i1);
    }

    // Check hero inventory
    for (let s = 1; s <= 6; s++) {
        checkAndAdd(data[`hi${s}`]);
    }
    // Check bags 1 to 8
    for (let b = 1; b <= 8; b++) {
        for (let s = 1; s <= 6; s++) {
            let itemKey = b === 1 ? `bi${s}` : `b${b}i${s}`;
            checkAndAdd(data[itemKey]);
        }
    }
    
    // Sort by tier (+5, +4 etc. or 풀백) descending
    found.sort((a, b) => {
        const nameA = getItemName(a, intToRawcode(a));
        const nameB = getItemName(b, intToRawcode(b));
        
        const getTier = (name) => {
            if (name.includes('풀백') || name.includes('풀강')) return 100;
            const match = name.match(/\+(\d+)$/);
            return match ? parseInt(match[1]) : 0;
        };
        
        return getTier(nameB) - getTier(nameA);
    });
    
    return found;
}

// Initialize Mobile Tab click event handlers
function initMobileTabs() {
    const tabBtnSearch = document.getElementById('tabBtnSearch');
    const tabBtnRankings = document.getElementById('tabBtnRankings');
    const appContainer = document.querySelector('.app-container');
    
    if (!tabBtnSearch || !tabBtnRankings || !appContainer) return;
    
    tabBtnSearch.addEventListener('click', () => {
        tabBtnSearch.classList.add('active');
        tabBtnRankings.classList.remove('active');
        appContainer.classList.remove('show-rankings');
        appContainer.classList.add('show-search');
    });
    
    tabBtnRankings.addEventListener('click', () => {
        tabBtnRankings.classList.add('active');
        tabBtnSearch.classList.remove('active');
        appContainer.classList.remove('show-search');
        appContainer.classList.add('show-rankings');
    });
}

// Map pBag numeric ID to bag skin name
function getBagNameById(pBag) {
    if (!pBag || pBag <= 0) return '없음';
    if (pBag >= 1 && pBag <= 3) return '카푸';
    if (pBag >= 4 && pBag <= 9) return pBag === 4 ? '블용' : `블용+${pBag - 4}`;
    if (pBag >= 10 && pBag <= 15) return pBag === 10 ? '스더' : `스더+${pBag - 10}`;
    if (pBag >= 16 && pBag <= 21) return pBag === 16 ? '꼬용' : `꼬용+${pBag - 16}`;
    if (pBag >= 22 && pBag <= 27) return pBag === 22 ? '타갓' : `타갓+${pBag - 22}`;
    if (pBag === 73) return '크린';
    if (pBag === 74) return '풀백';
    return `가방 #${pBag}`;
}

// Render Important Items Summary above Hero/Bag Inventory (only items with count > 0)
function renderImportantItems(data) {
    const card = document.getElementById('importantItemsCard');
    const grid = document.getElementById('importantItemsGrid');
    if (!card || !grid) return;

    const importantDefs = [
        { name: '펀 코어', id: 1227905614, color: '#38bdf8' },
        { name: '무한의 조각', id: 1227960392, color: '#c084fc' },
        { name: '확률증가권+30', id: 1227905589, color: '#f43f5e' },
        { name: '확률증가권+20', id: 1227905588, color: '#fb923c' },
        { name: '확률증가권+10', id: 1227905587, color: '#facc15' },
        { name: '실패의 파편', id: 1227905586, color: '#94a3b8' },
        { name: '황금 주괴', id: 1227899226, color: '#fbbf24' },
        { name: '심연의 정수', id: 1227899459, color: '#818cf8' },
        { name: '시간의 정수', id: 1227960369, color: '#2dd4bf' },
        { name: '성계의 정수', id: null, color: '#a78bfa' },
        { name: '태초의 정수', id: null, color: '#f472b6' }
    ];

    const counts = {};
    importantDefs.forEach(def => { counts[def.name] = 0; });

    const accumulateSlot = (itemId, rawCount) => {
        if (!itemId || itemId === 0) return;
        const cnt = (rawCount && rawCount > 0) ? rawCount : 1;
        const resolvedName = getItemName(itemId, intToRawcode(itemId), 0)
            .replace(/^\[+|\]+$/g, '')
            .trim();

        for (const def of importantDefs) {
            if ((def.id && itemId === def.id) || resolvedName === def.name) {
                counts[def.name] += cnt;
                break;
            }
        }
    };

    // Hero inventory (hi1..6)
    for (let s = 1; s <= 6; s++) {
        accumulateSlot(data[`hi${s}`], data[`h${s}c`]);
    }
    // Bags 1..8
    for (let b = 1; b <= 8; b++) {
        for (let s = 1; s <= 6; s++) {
            const itemKey = b === 1 ? `bi${s}` : `b${b}i${s}`;
            const countKey = b === 1 ? (data[`b1${s}c`] !== undefined ? `b1${s}c` : `b${s}c`) : `b${b}${s}c`;
            accumulateSlot(data[itemKey], data[countKey]);
        }
    }

    grid.innerHTML = '';
    let hasAny = false;

    for (const def of importantDefs) {
        const total = counts[def.name];
        if (total > 0) {
            hasAny = true;
            const chip = document.createElement('div');
            chip.className = 'important-item-chip';
            chip.innerHTML = `
                <span class="imp-name">${def.name}</span>
                <span class="imp-count" style="color: ${def.color}">${total.toLocaleString()}</span>
            `;
            grid.appendChild(chip);
        }
    }

    if (hasAny) {
        card.classList.remove('hidden');
    } else {
        card.classList.add('hidden');
    }
}

// Patch Info & Version Badge Logic
let patchInfoData = null;
let activePatchIndex = 0;

async function loadPatchInfo() {
    const versionText = document.getElementById('mapVersionText');
    try {
        const resp = await fetch('/api/patchinfo?t=' + Date.now());
        if (!resp.ok) throw new Error('Patch info error');
        patchInfoData = await resp.json();

        if (versionText && patchInfoData && patchInfoData.latest) {
            const latest = patchInfoData.latest;
            const verLabel = latest.version ? `최신 v${latest.version}` : (latest.title || '패치노트');
            versionText.textContent = `${verLabel} · 패치노트`;
        }
    } catch (e) {
        console.error('Failed to load patch info', e);
        if (versionText) versionText.textContent = '패치노트';
    }
}

function openPatchModal() {
    const modal = document.getElementById('patchNoteModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    renderPatchModalContent();
}

function closePatchModal() {
    const modal = document.getElementById('patchNoteModal');
    if (modal) modal.classList.add('hidden');
}

function renderPatchModalContent() {
    const tabs = document.getElementById('patchVersionTabs');
    const detailBox = document.getElementById('patchDetailBox');
    const extLink = document.getElementById('patchExternalLink');
    if (!tabs || !detailBox) return;

    if (!patchInfoData || !patchInfoData.patches || patchInfoData.patches.length === 0) {
        tabs.innerHTML = '';
        detailBox.innerHTML = '<div class="text-center text-muted">패치 노트 정보를 불러오지 못했습니다.</div>';
        return;
    }

    tabs.innerHTML = '';
    patchInfoData.patches.forEach((p, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `patch-ver-btn ${idx === activePatchIndex ? 'active' : ''}`;
        btn.textContent = p.version ? `v${p.version}` : p.title;
        btn.addEventListener('click', () => {
            activePatchIndex = idx;
            renderPatchModalContent();
        });
        tabs.appendChild(btn);
    });

    const cur = patchInfoData.patches[activePatchIndex] || patchInfoData.patches[0];
    if (extLink && cur.url) {
        extLink.href = cur.url;
    }

    let html = `
        <div class="patch-detail-header">
            <span class="patch-detail-title">${escapeHtml(cur.title)}</span>
            <span class="patch-detail-date">${escapeHtml(cur.date || '')}</span>
        </div>
    `;

    if (cur.summary && cur.summary.length > 0) {
        html += '<ul class="patch-summary-list">';
        cur.summary.forEach(line => {
            html += `<li>${escapeHtml(line)}</li>`;
        });
        html += '</ul>';
    }

    if (cur.content) {
        html += `<div class="patch-raw-content">${escapeHtml(cur.content)}</div>`;
    } else if (!cur.summary || cur.summary.length === 0) {
        html += '<div class="text-muted" style="font-size:0.84rem;">해당 버전의 등록된 요약 본문이 없습니다. 하단 [M16 툴 원문 보기]를 확인해 주세요.</div>';
    }

    detailBox.innerHTML = html;
}

// Sidebar Game Info Tab (Items & Bosses)
let gameInfoRendered = false;

function switchInfoSubtab(tab) {
    const btnItems = document.getElementById('subtabItems');
    const btnBosses = document.getElementById('subtabBosses');
    const itemsBox = document.getElementById('infoItemsContent');
    const bossesBox = document.getElementById('infoBossesContent');
    if (!btnItems || !btnBosses || !itemsBox || !bossesBox) return;

    if (tab === 'items') {
        btnItems.classList.add('active');
        btnBosses.classList.remove('active');
        itemsBox.classList.remove('hidden');
        bossesBox.classList.add('hidden');
    } else {
        btnBosses.classList.add('active');
        btnItems.classList.remove('active');
        bossesBox.classList.remove('hidden');
        itemsBox.classList.add('hidden');
    }
}

function renderGameInfo() {
    if (gameInfoRendered) return;
    gameInfoRendered = true;

    const itemsBox = document.getElementById('infoItemsContent');
    const bossesBox = document.getElementById('infoBossesContent');
    if (!itemsBox || !bossesBox) return;

    const itemGuides = [
        {
            title: '미다스 (미다스[+0] ~ [+9])',
            color: '#fbbf24',
            totalBadge: '제작 펀 코어 10개 / 주괴 58개',
            bossEntry: '<b>보스 입장:</b> 정력 7+ & 인피니티[10]+ / <span class="funcore-hl">펀 코어 1개</span> + 정뱅 10만 (골든 실드 30타)',
            craft: '<b>+0 제작(100%):</b> <span class="funcore-hl">펀 코어 10개</span> + 인피니티[10] + 미다스의 핵 1개 + 정뱅 20만',
            steps: [
                { stage: '+1강', funcore: '-', sub: '황금 주괴 1개 / 정뱅 5만' },
                { stage: '+2강', funcore: '-', sub: '황금 주괴 2개 / 정뱅 7만' },
                { stage: '+3강', funcore: '-', sub: '황금 주괴 3개 / 정뱅 10만' },
                { stage: '+4강', funcore: '-', sub: '황금 주괴 4개 / 정뱅 15만' },
                { stage: '+5강', funcore: '-', sub: '황금 주괴 5개 / 정뱅 20만' },
                { stage: '+6강', funcore: '-', sub: '황금 주괴 7개 / 정뱅 30만' },
                { stage: '+7강', funcore: '-', sub: '황금 주괴 9개 / 정뱅 40만' },
                { stage: '+8강', funcore: '-', sub: '황금 주괴 12개 / 정뱅 50만' },
                { stage: '+9강(MAX)', funcore: '-', sub: '황금 주괴 15개 / 정뱅 70만' }
            ],
            totalRow: { funcore: '제작 10개 (강화 0)', sub: '황금 주괴 58개 / 정뱅 총 267만' }
        },
        {
            title: '아바돈 (아바돈 : +0 ~ +9)',
            color: '#a855f7',
            totalBadge: '제작 펀 코어 15개 + 강화',
            bossEntry: '<b>보스 입장:</b> 정력 9+ & 미다스[+7]+ / <span class="funcore-hl">펀 코어 2개</span> + 정뱅 20만 (3페이즈 / 결계 60타)',
            craft: '<b>+0 제작(100%):</b> <span class="funcore-hl">펀 코어 15개</span> + 미다스[+9] + 아바돈의 핵 1개 + 정뱅 30만',
            steps: [
                { stage: '+1 ~ +9 강화', funcore: '펀 코어 소모', sub: '심연의 정수 / 정수뱅크 (인게임 툴팁 확인)' }
            ],
            totalRow: { funcore: '제작 15개 + 강화', sub: '+7강 이상 시 [무한의 탑] 입장 조건 충족' }
        },
        {
            title: '크로노스 — 고대 무기 (+0 ~ +9)',
            color: '#2dd4bf',
            totalBadge: '9강 총 펀 코어 129개 / 시간의 정수 66개',
            bossEntry: '<b>보스 입장:</b> 정력 12+ & 아바돈[+7]+ / <span class="funcore-hl">펀 코어 3개</span> + 정뱅 30만 (결계 100타 / 시간 역행)',
            craft: '<b>+0 제작:</b> <span class="funcore-hl">펀 코어</span> + 아바돈[+9] + 시간의 핵 + 정수뱅크',
            steps: [
                { stage: '+1강', funcore: '3개', sub: '시간의 정수 1개 / 정뱅 20만' },
                { stage: '+2강', funcore: '5개', sub: '시간의 정수 2개 / 정뱅 30만' },
                { stage: '+3강', funcore: '7개', sub: '시간의 정수 3개 / 정뱅 45만' },
                { stage: '+4강', funcore: '10개', sub: '시간의 정수 4개 / 정뱅 60만' },
                { stage: '+5강', funcore: '13개', sub: '시간의 정수 5개 / 정뱅 80만' },
                { stage: '+6강', funcore: '16개', sub: '시간의 정수 7개 / 정뱅 110만' },
                { stage: '+7강', funcore: '20개', sub: '시간의 정수 10개 / 정뱅 150만' },
                { stage: '+8강', funcore: '25개', sub: '시간의 정수 14개 / 정뱅 200만' },
                { stage: '+9강(MAX)', funcore: '30개', sub: '시간의 정수 20개 / 정뱅 250만' }
            ],
            totalRow: { funcore: '총 129개 (강화)', sub: '시간의 정수 66개 / 정뱅 945만' }
        },
        {
            title: '에테리온 — 성계 무기 (+0 ~ +9)',
            color: '#818cf8',
            totalBadge: '9강 총 펀 코어 255개 (제작30+강화225)',
            bossEntry: '<b>보스 입장 [D]:</b> 정력 15+ & 고대 무기[+7]+ / <span class="funcore-hl">펀 코어 5개</span> + 정뱅 50만 (결계 140타)',
            craft: '<b>+0 각성(100%):</b> <span class="funcore-hl">펀 코어 30개</span> + 고대[+9] + 성계의 핵 + 무한의 조각 30개 + 정뱅 200만',
            steps: [
                { stage: '+1강', funcore: '5개', sub: '성계의 정수 1개 / 정뱅 40만' },
                { stage: '+2강', funcore: '10개', sub: '성계의 정수 / 정뱅 증가' },
                { stage: '+3강', funcore: '15개', sub: '성계의 정수 / 정뱅 증가' },
                { stage: '+4강', funcore: '20개', sub: '성계의 정수 / 정뱅 증가' },
                { stage: '+5강', funcore: '25개', sub: '성계의 정수 / 정뱅 증가' },
                { stage: '+6강', funcore: '30개', sub: '성계의 정수 / 정뱅 증가' },
                { stage: '+7강', funcore: '35개', sub: '성계 유성 격파 해금 / S키 Lv.7' },
                { stage: '+8강', funcore: '40개', sub: '성계의 정수 / 정뱅 증가' },
                { stage: '+9강', funcore: '45개', sub: '성계의 정수 25개 / 정뱅 500만' }
            ],
            totalRow: { funcore: '총 255개 (제작30 + 강화225)', sub: '성계의 정수 1→25개 / 정뱅 40만→500만' }
        },
        {
            title: '네메시스 — 창세 무기 (+0 ~ +9)',
            color: '#f43f5e',
            totalBadge: '제작 50개 + 강화 8→60개',
            bossEntry: '<b>보스 입장 [F]:</b> 정력 20+ & 성계 무기[+7]+ / <span class="funcore-hl">펀 코어 8개</span> + 정뱅 100만 (결계 180타)',
            craft: '<b>+0 각성(100%):</b> <span class="funcore-hl">펀 코어 50개</span> + 성계[+9] + 태초의 핵 + 무한의 조각 50개 + 정뱅 400만',
            steps: [
                { stage: '+1강 → +9강', funcore: '8개 → 60개', sub: '태초의 정수 1→30개 / 정뱅 80만→1,000만' },
                { stage: '+7강 해금', funcore: '-', sub: '창세 심판 폭발(7%, 21억) / S키 Lv.8' }
            ],
            totalRow: { funcore: '제작 50 + 강화(8→60개)', sub: '태초의 정수 1→30개 / 정뱅 80만→1,000만' }
        },
        {
            title: '주요 방어구 · 스킬북 조합 요약',
            color: '#10b981',
            totalBadge: '핵심 재료',
            craft: '<b>날만강[HP:5]:</b> <span class="funcore-hl">펀 코어 10</span> + HP:4 + 업글석 10 + 정뱅 5만<br><b>날만강[HP:6]:</b> <span class="funcore-hl">펀 코어 15</span> + HP:5 + 업글석 15 + 무한조각 10 + 정뱅 30만<br><b>제4장 스킬북:</b> <span class="funcore-hl">펀 코어 20</span> + 제3장 + 시간의 핵 + 무한조각 100 + 정뱅 200만',
            steps: [],
            totalRow: null
        }
    ];

    itemsBox.innerHTML = itemGuides.map(g => {
        const rowsHtml = g.steps.map(st => `
            <tr>
                <td>${st.stage}</td>
                <td class="funcore-hl">${st.funcore}</td>
                <td>${st.sub}</td>
            </tr>
        `).join('');
        const totalHtml = g.totalRow ? `
            <tr class="total-row">
                <td>+9 총합</td>
                <td class="funcore-hl">${g.totalRow.funcore}</td>
                <td>${g.totalRow.sub}</td>
            </tr>
        ` : '';
        const tableHtml = g.steps.length > 0 ? `
            <table class="info-enhance-table">
                <thead>
                    <tr>
                        <th style="width:24%">단계</th>
                        <th style="width:32%">펀 코어</th>
                        <th style="width:44%">기타 소모 재료</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}${totalHtml}</tbody>
            </table>
        ` : '';
        const bossEntryHtml = g.bossEntry ? `<div class="info-boss-entry">${g.bossEntry}</div>` : '';
        return `
            <div class="info-guide-card">
                <div class="info-card-top">
                    <span class="info-card-title" style="color:${g.color}">${g.title}</span>
                    <span class="info-total-badge">${g.totalBadge}</span>
                </div>
                ${bossEntryHtml}
                <div class="info-craft-row">${g.craft}</div>
                ${tableHtml}
            </div>
        `;
    }).join('');

    const bossGuides = [
        {
            title: '중간보스',
            color: '#cbd5e1',
            conds: [
                'VIP 10 이상 입장 가능',
                '1일 5회 가능'
            ],
            rewards: [
                '1회 클리어 시: 정수 1만, 정신력 10만 획득'
            ]
        },
        {
            title: '협동보스',
            color: '#38bdf8',
            conds: [
                'VIP 20 이상 입장 가능',
                '1일 5회 가능'
            ],
            rewards: [
                '1회 클리어 시: 정수 10만, 정신력 100만 획득'
            ]
        },
        {
            title: '월보 (월드보스)',
            color: '#facc15',
            conds: [
                '오픈 시간: 오전 8시~11시 / 오후 8시~11시',
                '보스 메뉴(BOSS) → 월드보스 (카오스보스와 신전 공유)'
            ],
            rewards: [
                '펀 코어 0~3개',
                '정수뱅크, 정신력, 확률증가권 등 타수 달성 보상',
                '초희귀 드랍: 2% 확률 [무한의 탑 입장권]'
            ]
        },
        {
            title: '카오스보스 (총 30만 타격)',
            color: '#f43f5e',
            conds: [
                '미다스 무기 이상 착용 / 상시 오픈 (1일 1회, 자정 리셋)',
                '보스 메뉴(BOSS) → [카오스보스] (4종 패턴 회피 기믹)'
            ],
            rewards: [
                '4만타 달성: 정뱅 +70만 / 정신력 +700만 / 확증+30 (1위 5장, 2위 4장, 일반 2장) / 펀 코어 2~6개',
                '2만타 참여: 정뱅 +35만 / 정신력 +350만 / 확증+30 1장 / 펀 코어 1~2개(확률)',
                '초희귀 드랍: 5% 확률 [무한의 탑 입장권]'
            ]
        },
        {
            title: '무한의 탑 (1층 ~ 50층)',
            color: '#c084fc',
            conds: [
                '정력 10 이상 & 아바돈[+7] 이상 착용',
                '1일 1회 무료 입장 (자정 리셋) / 입장권 소지 시 재입장 가능',
                '1~5인 파티 협동 (입장 후 20초 대기)'
            ],
            rewards: [
                '매 층 정복: 전원 정수뱅크 +(층수 × 10,000)',
                '매 5층 보스 층: 전원 펀 코어 1개 (50층 완주 시 총 10개)',
                '바닥 드랍: 최고 VIP 기준 차등 확률로 [무한의 조각] 드랍'
            ]
        }
    ];

    bossesBox.innerHTML = bossGuides.map(b => `
        <div class="info-guide-card">
            <div class="info-card-top">
                <span class="info-card-title" style="color:${b.color}">${b.title}</span>
            </div>
            <div class="boss-section-block">
                <span class="boss-block-label cond">입장 조건</span>
                <ul class="boss-info-list">
                    ${b.conds.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>
            <div class="boss-section-block">
                <span class="boss-block-label reward">주요 보상</span>
                <ul class="boss-info-list">
                    ${b.rewards.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
        </div>
    `).join('');
}
