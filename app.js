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

    // 3. Load Rankings
    await loadRankings();
    
    // 4. Bind Search Form Submit
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const queryName = nicNameInput.value.trim();
        if (queryName) {
            searchUser(queryName);
        }
    });
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

    // 3.5 Special Stats Summary Display (이만강, 수련치, VIP, 정수뱅크, 정신력, 정력, 펫, 가방)
    const specialStatsBar = document.getElementById('specialStatsBar');
    if (specialStatsBar) {
        specialStatsBar.innerHTML = '';
        
        // Find counts
        const cntImangang = findItemCount(data, 1227895602);
        const cntSuryeonchi = findItemCount(data, 776548403);
        const cntVip = findItemCount(data, 1227902280);
        const cntJeongsuBank = findItemCount(data, 1227896147);
        const cntJeonsinryeok = findItemCount(data, 1227901528);
        const cntJeongryeok = findItemCount(data, 1227903062);
        
        // 별성 (Star Grade) calculation & mapping
        const cntStars = findItemCount(data, 1227903310);
        const starMapping = {
            "1":"노랑1","2":"노랑2","3":"노랑3","4":"노랑4","5":"노랑5",
            "6":"녹색1","7":"녹색2","8":"녹색3","9":"녹색4","10":"녹색5",
            "11":"핑크1","12":"핑크2","13":"핑크3","14":"핑크4","15":"핑크5",
            "16":"레드1","17":"레드2","18":"레드3","19":"레드4","20":"레드5",
            "21":"퍼플1","22":"퍼플2","23":"퍼플3","24":"퍼플4","25":"퍼플5",
            "26":"블루1","27":"블루2","28":"블루3","29":"블루4","30":"블루5",
            "31":"블랙1","32":"블랙2","33":"블랙3","34":"블랙4","35":"블랙5",
            "36":"화이트1","37":"화이트2","38":"화이트3","39":"화이트4","40":"화이트5",
            "41":"레인보우1","42":"레인보우2","43":"레인보우3","44":"레인보우4","45":"레인보우5"
        };
        const starName = starMapping[cntStars.toString()] || (cntStars > 0 ? `${cntStars}성` : '없음');
        
        let starColor = '#f43f5e'; // Default fallback color
        if (starName.includes('노랑')) starColor = '#eab308';
        else if (starName.includes('녹색')) starColor = '#22c55e';
        else if (starName.includes('핑크')) starColor = '#ec4899';
        else if (starName.includes('레드')) starColor = '#ef4444';
        else if (starName.includes('퍼플')) starColor = '#a855f7';
        else if (starName.includes('블루')) starColor = '#3b82f6';
        else if (starName.includes('블랙')) starColor = '#94a3b8';
        else if (starName.includes('화이트')) starColor = '#f8fafc';
        
        // Find if player has any of the 20 bag items in inventory or bags
        const bagItemId = findBagItem(data);
        const ownedBagName = bagItemId ? getItemName(bagItemId, intToRawcode(bagItemId)) : '없음';
        
        const specialList = [
            { label: '이만강', value: cntImangang.toLocaleString(), color: '#cbd5e1' },
            { label: '수련치', value: cntSuryeonchi.toLocaleString(), color: '#10b981' },
            { label: 'VIP', value: cntVip.toLocaleString(), color: '#fef08a' },
            { label: '정수뱅크', value: cntJeongsuBank.toLocaleString(), color: '#3b82f6' },
            { label: '정신력', value: cntJeonsinryeok.toLocaleString(), color: '#a855f7' },
            { label: '정력', value: cntJeongryeok.toLocaleString(), color: '#ef4444' },
            { label: '별성', value: starName, color: starColor },
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

    // 5. Bag Tabs & Inventory (8 bags)
    renderBagTabs(data);
    renderBagInventory(data);

    // 6. Raw JSON Code block
    rawJsonCode.textContent = JSON.stringify(data, null, 2);
}

// Render tabs for 8 bags
function renderBagTabs(data) {
    bagTabs.innerHTML = '';
    for (let b = 1; b <= 8; b++) {
        const bagKey = b === 1 ? 'b' : `b${b}`;
        const bagItemCode = data[bagKey];
        
        // Even if empty, render it but style empty/non-empty differently
        const btn = document.createElement('button');
        btn.className = `bag-btn ${b === activeBagIndex ? 'active-bag' : ''}`;
        
        const bagName = getItemName(bagItemCode, intToRawcode(bagItemCode));
        const bagDisplayName = bagItemCode ? `${b}번 가방 (${bagName})` : `${b}번 가방`;
        
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
    
    activeBagName.textContent = `가방 ${b} (${getItemName(bagItemCode, bagCodeStr)})`;
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

// Helper to find if player possesses any of the 20 bag items in their inventory/bags
function findBagItem(data) {
    const bagItemIds = [
        1226460217, 1226460751, 1226460755, 1226460225, 1226461268,
        1226460228, 1226462021, 1226462022, 1226460215, 1226460745,
        1226460214, 1226460750, 1226460230, 1226460229, 1226460216,
        1226461263, 1226460227, 1226462003, 1226460226, 1226461273
    ];
    
    // Check hero inventory
    for (let s = 1; s <= 6; s++) {
        const itemCode = data[`hi${s}`];
        if (itemCode && bagItemIds.includes(itemCode)) {
            return itemCode;
        }
    }
    // Check bags 1 to 8
    for (let b = 1; b <= 8; b++) {
        for (let s = 1; s <= 6; s++) {
            let itemKey;
            if (b === 1) {
                itemKey = `bi${s}`;
            } else {
                itemKey = `b${b}i${s}`;
            }
            const itemCode = data[itemKey];
            if (itemCode && bagItemIds.includes(itemCode)) {
                return itemCode;
            }
        }
    }
    return null;
}
