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

    // 3. Load Rankings & Event Logs
    await loadRankings();
    loadEventLogs();
    
    // Bind Sidebar Tabs
    const tabRankings = document.getElementById('tabRankings');
    const tabEventLogs = document.getElementById('tabEventLogs');
    const panelRankings = document.getElementById('panelRankings');
    const panelEventLogs = document.getElementById('panelEventLogs');
    
    if (tabRankings && tabEventLogs) {
        tabRankings.addEventListener('click', () => {
            tabRankings.classList.add('active');
            tabEventLogs.classList.remove('active');
            panelRankings.classList.remove('hidden');
            panelEventLogs.classList.add('hidden');
        });

        tabEventLogs.addEventListener('click', () => {
            tabEventLogs.classList.add('active');
            tabRankings.classList.remove('active');
            panelEventLogs.classList.remove('hidden');
            panelRankings.classList.add('hidden');
            loadEventLogs();
        });
    }
    
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

// Load rankings from backend API
async function loadRankings() {
    try {
        const response = await fetch('/api/rankings?t=' + Date.now());
        if (!response.ok) throw new Error('API response error');
        
        const ranks = await response.json();
        rankingBody.innerHTML = '';
        
        if (ranks.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">랭킹 데이터가 없습니다.</td></tr>';
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
                               
            tr.innerHTML = `
                <td>${badgeHtml}</td>
                <td><div class="rank-name" title="${player.nicname}">${player.nicname}</div></td>
                <td><span class="rank-score">${Number(player.score).toLocaleString()}</span></td>
            `;
            
            tr.addEventListener('click', () => {
                nicNameInput.value = player.nicname;
                searchUser(player.nicname);
            });
            
            rankingBody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error loading rankings', e);
        rankingBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted"><i class="fa-solid fa-triangle-exclamation"></i> 불러오기 실패</td></tr>';
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

    // 3.5 Special Stats Summary Display (이만강, 수련치, VIP, 정수뱅크, 정신력, 정력, 별성, 펫 등급, DP[대륙], 동상, 후포, 가방)
    const specialStatsBar = document.getElementById('specialStatsBar');
    if (specialStatsBar) {
        specialStatsBar.innerHTML = '';
        
        const logStats = slotObj.log_stats || {};

        // Find counts
        const cntImangang = findItemCount(data, 1227895602);
        const cntSuryeonchi = findItemCount(data, 776548403);
        const cntVip = findItemCount(data, 1227902280);
        const cntJeongsuBank = findItemCount(data, 1227896147);
        const cntJeonsinryeok = findItemCount(data, 1227901528);
        const cntJeongryeok = findItemCount(data, 1227903062);
        const cntDp = (logStats.dp !== undefined) ? logStats.dp : findItemCount(data, 1227903799);
        const cntStatue = (logStats.statue !== undefined) ? logStats.statue : findItemCount(data, 1227903800);
        
        // 후포 (Title/Hupo: Log parsing priority)
        let cntHupo = 0;
        if (logStats.hupo !== undefined) {
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
        const cntStars = (logStats.stars !== undefined) ? logStats.stars : findItemCount(data, 1227903310);
        const starInfo = getStarGradeInfo(cntStars);
        const starName = starInfo.name;
        const starColor = starInfo.color;

        // Pet Grade calculation
        let petGrade = 0;
        if (logStats.pet_grade !== undefined) {
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
        
        // 요정 레벨 (Fairy Level: 1227903044 or log priority)
        const cntFairy = (logStats.fairy_level !== undefined) 
            ? logStats.fairy_level 
            : (data.log_fairy_level !== undefined ? data.log_fairy_level : findItemCount(data, 1227903044));

        // Find bag skin (log priority, else check equipped b6i1 slot, else 없음)
        let ownedBagName = '없음';
        if (logStats.bag_skin && logStats.bag_skin !== '없음' && !logStats.bag_skin.startsWith('영웅') && !logStats.bag_skin.startsWith('(')) {
            ownedBagName = logStats.bag_skin;
        } else if (data.log_bag_skin && data.log_bag_skin !== '없음' && !data.log_bag_skin.startsWith('영웅') && !data.log_bag_skin.startsWith('(')) {
            ownedBagName = data.log_bag_skin;
        } else if (data.b6i1) {
            const b6Name = getItemName(data.b6i1, intToRawcode(data.b6i1));
            if ((b6Name.includes('가방') || b6Name.includes('풀백') || b6Name.includes('루미') || b6Name.includes('풀강') || b6Name.includes('보물')) && !b6Name.includes('미등록') && !b6Name.includes('알 수 없는') && !b6Name.startsWith('(')) {
                ownedBagName = b6Name;
            }
        }
        
        const specialList = [
            { label: '이만강', value: cntImangang.toLocaleString(), color: '#cbd5e1' },
            { label: '수련치', value: cntSuryeonchi.toLocaleString(), color: '#10b981' },
            { label: 'VIP', value: cntVip.toLocaleString(), color: '#fef08a' },
            { label: '정수뱅크', value: cntJeongsuBank.toLocaleString(), color: '#3b82f6' },
            { label: '정신력', value: cntJeonsinryeok.toLocaleString(), color: '#a855f7' },
            { label: '정력', value: cntJeongryeok.toLocaleString(), color: '#ef4444' },
            { label: '별성', value: starName, color: starColor },
            { label: '펫 등급', value: petGrade.toLocaleString(), color: '#f472b6' },
            { label: '요정 레벨', value: cntFairy.toLocaleString(), color: '#818cf8' },
            { label: 'DP[대륙]', value: cntDp.toLocaleString(), color: '#f97316' },
            { label: '동상', value: cntStatue.toLocaleString(), color: '#10b981' },
            { label: '후포', value: cntHupo.toLocaleString(), color: '#c084fc' },
            { label: '가방', value: ownedBagName, color: '#0ea5e9' }
        ];
        
        specialList.forEach(item => {
            const chip = document.createElement('div');
            chip.className = 'special-stat-chip';
            chip.innerHTML = `
                <span class="chip-label">${item.label}</span>
                <span class="chip-value" style="color: ${item.color}" title="${item.value}">${item.value}</span>
            `;
            specialStatsBar.appendChild(chip);
        });
    }

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
