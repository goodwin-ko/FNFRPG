import basicInfo from './data/basicInfo.js';
import heroStats from './data/heroStats.js';
import equipment from './data/equipment.js';
import petInfo from './data/petInfo.js';
import bags from './data/bags.js';
import items from './data/items.js';

const STAR_GRADES = {
  1: '노랑1', 2: '노랑2', 3: '노랑3', 4: '노랑4', 5: '노랑5',
  6: '녹색1', 7: '녹색2', 8: '녹색3', 9: '녹색4', 10: '녹색5',
  11: '핑크1', 12: '핑크2', 13: '핑크3', 14: '핑크4', 15: '핑크5',
  16: '레드1', 17: '레드2', 18: '레드3', 19: '레드4', 20: '레드5',
  21: '퍼플1', 22: '퍼플2', 23: '퍼플3', 24: '퍼플4', 25: '퍼플5',
  26: '블루1', 27: '블루2', 28: '블루3', 29: '블루4', 30: '블루5',
  31: '블랙1', 32: '블랙2', 33: '블랙3', 34: '블랙4', 35: '블랙5',
  36: '화이트1', 37: '화이트2', 38: '화이트3', 39: '화이트4', 40: '화이트5',
  41: '레인보우1', 42: '레인보우2', 43: '레인보우3', 44: '레인보우4', 45: '레인보우5'
};

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderBasicInfo() {
  setText('save-id', basicInfo.id);
  setText('save-time', basicInfo.lastSaved);
}

function renderHeroStats() {
  setText('stat-str', heroStats.str);
  setText('stat-agi', heroStats.agi);
  setText('stat-int', heroStats.int);

  setText('detail-damage', heroStats.details.damage);
  setText('detail-training', heroStats.details.training);
  setText('detail-essence', heroStats.details.essence);
  setText('detail-bank', heroStats.details.bank);
  setText('detail-mind', heroStats.details.mind);
  setText('detail-energy', heroStats.details.energy);
  setText('detail-vip', heroStats.details.vip);
  setText('detail-rank', heroStats.details.rank);
}

function createSlot(item) {
  const slot = document.createElement('div');
  slot.className = 'equipment-slot';

  const name = document.createElement('span');
  name.className = 'item-name';
  name.textContent = item.name;

  const rarity = document.createElement('span');
  rarity.className = 'item-rarity';
  rarity.textContent = item.rarity;

  slot.append(name, rarity);

  return slot;
}

function renderEquipment() {
  const heroEquipment = document.getElementById('hero-equipment');
  const bagEquipment = document.getElementById('bag-equipment');
  heroEquipment.innerHTML = '';
  bagEquipment.innerHTML = '';

  equipment.hero.forEach(item => heroEquipment.appendChild(createSlot(item)));
  equipment.bag.forEach(item => bagEquipment.appendChild(createSlot(item)));
}

function renderPetInfo() {
  setText('pet-str', petInfo.str);
  setText('pet-agi', petInfo.agi);
  setText('pet-int', petInfo.int);
}

function renderBags() {
  const bagsContainer = document.getElementById('bags-container');
  bagsContainer.innerHTML = '';

  bags.forEach(bag => {
    const bagCard = document.createElement('div');
    bagCard.className = 'bag-card';

    const title = document.createElement('h3');
    title.textContent = bag.name;

    const bagItems = document.createElement('div');
    bagItems.className = 'bag-items';

    bag.items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'bag-item';

      const itemName = document.createElement('span');
      itemName.className = 'item-name';
      itemName.textContent = item.name;

      const itemRarity = document.createElement('span');
      itemRarity.className = 'item-rarity';
      itemRarity.textContent = item.rarity;

      itemEl.append(itemName, itemRarity);
      bagItems.appendChild(itemEl);
    });

    bagCard.append(title, bagItems);
    bagsContainer.appendChild(bagCard);
  });
}

function parseApiResponse(text) {
  const data = {};
  const regex = /"([^"\r\n]+)":\s*(?:"([^"\\]*)"|(\-?\d+))/g;
  let match;

  while ((match = regex.exec(text))) {
    const key = match[1];
    const value = match[2] !== undefined ? match[2] : match[3];
    data[key] = /^\d+$/.test(value) ? Number(value) : value;
  }

  return data;
}

function mapItemValue(value) {
  if (!value) return null;
  return items.find(item => item.value === value) || null;
}

function buildEquipmentFromData(data) {
  const heroItems = [];
  const bagItems = [];

  for (let i = 1; i <= 6; i++) {
    const value = Number(data[`hero_item${i}`] || 0);
    if (!value) {
      heroItems.push({ name: 'Empty', rarity: '' });
      continue;
    }

    const item = mapItemValue(value);
    heroItems.push({
      name: item ? item.name : `Unknown (${value})`,
      rarity: item ? item.category : 'Unknown'
    });
  }

  for (let i = 1; i <= 6; i++) {
    const value = Number(data[`bag_item${i}`] || 0);
    if (!value) {
      bagItems.push({ name: 'Empty', rarity: '' });
      continue;
    }

    const item = mapItemValue(value);
    bagItems.push({
      name: item ? item.name : `Unknown (${value})`,
      rarity: item ? item.category : 'Unknown'
    });
  }

  return { hero: heroItems, bag: bagItems };
}

function updateHeroStatsFromApi(data) {
  heroStats.str = data.heroStr || 0;
  heroStats.agi = data.heroAgi || 0;
  heroStats.int = data.heroInt || 0;

  if (data.bag8_item1char !== undefined) heroStats.details.vip = data.bag8_item1char;
  if (data.bag8_item2char !== undefined) heroStats.details.mind = data.bag8_item2char;

  const rankValue = Number(data.bag8_item3char || 0);
  heroStats.details.rank = STAR_GRADES[rankValue] || rankValue || '없음';
  heroStats.details.rankValue = rankValue;

  if (data.bag8_item4char !== undefined) heroStats.details.energy = data.bag8_item4char;

  renderHeroStats();
}

function updatePetInfoFromApi(data) {
  petInfo.str = data.petStr || 0;
  petInfo.agi = data.petAgi || 0;
  petInfo.int = data.petInt || 0;
  renderPetInfo();
}

function extractSaveTime(text) {
  const match = text.match(/(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})|(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/);
  if (!match) return null;
  const value = match[0];

  if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) {
    const parts = value.split(/[\/\s:]+/);
    if (parts.length === 6) {
      const [month, day, year, hour, minute, second] = parts;
      return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
    }
    return value;
  }

  return value;
}

function setSearchStatus(message, isError = false) {
  const status = document.getElementById('search-status');
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? '#ff7a7a' : 'var(--muted)';
}

async function fetchUserData(nicName) {
  if (!nicName) {
    setSearchStatus('검색할 아이디를 입력하세요.', true);
    return;
  }

  setSearchStatus('데이터를 불러오는 중입니다...');

  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let url;

    if (isLocal) {
      url = `https://m16tool.xyz/Game/FNF%20RPG%20J/UserLog/LogResult?nicName=${encodeURIComponent(nicName)}`;
    } else {
      url = `/api/proxy?nicName=${encodeURIComponent(nicName)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const data = parseApiResponse(text);
    if (!data.heroStr && !data.saveDataGold && !data.petAgi && !data.petInt) {
      throw new Error('유효한 데이터가 없습니다. 아이디를 확인하세요.');
    }

    basicInfo.id = nicName;
    const saveTime = data.saveTime || extractSaveTime(text);
    if (saveTime) {
      basicInfo.lastSaved = saveTime;
    }

    updateHeroStatsFromApi(data);
    updatePetInfoFromApi(data);

    const equipmentData = buildEquipmentFromData(data);
    equipment.hero = equipmentData.hero;
    equipment.bag = equipmentData.bag;
    renderEquipment();
    renderBasicInfo();

    setSearchStatus('데이터 로드 완료.');
  } catch (error) {
    setSearchStatus(`검색 오류: ${error.message}`, true);
  }
}

function init() {
  const searchButton = document.getElementById('user-search-button');
  const searchInput = document.getElementById('user-search');

  if (searchButton && searchInput) {
    const doSearch = () => fetchUserData(searchInput.value.trim());
    searchButton.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') doSearch();
    });
  }
}

init();
