// ============================================================
//  Family Tree App — Auth, Multi-Tree, Auto-Save, Simple Lines
// ============================================================

let supabase = null;
try {
  const supabaseUrl = 'https://ahqhqyevzqpjnaoqnfoj.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocWhxeWV2enFwam5hb3FuZm9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjIzNzgsImV4cCI6MjA5MDAzODM3OH0.de8h1RR3ATHyEJtM89ZOZfvpAeEhTXuk4CcPKgors6Q';
  supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
} catch (e) {
  console.error("Supabase failed to load. Are you opening index.html directly from your folders instead of localhost?", e);
  setTimeout(() => alert("Error: Database connection blocked! Please open this site using http://localhost:3000 to unblock the database."), 1000);
}

// ==================== Utility ====================

function $(id) { return document.getElementById(id); }

function showMsg(el, type, text) {
  el.textContent = text;
  el.classList.remove("error", "success");
  if (type) el.classList.add(type);
}

// Generate UUID for quick frontend syncing before Postgres confirms
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ==================== DOM References ====================

const authPage = $("auth-page");
const welcomePage = $("welcome-page");
const newTreePage = $("new-tree-page");
const dashboard = $("dashboard");

const tabLogin = $("tab-login");
const tabRegister = $("tab-register");
const loginForm = $("login-form");
const registerForm = $("register-form");
const loginMessage = $("login-message");
const registerMessage = $("register-message");

const welcomeNameEl = $("welcome-name");
const welcomeCreateBtn = $("welcome-create-btn");

const newTreeForm = $("new-tree-form");
const newTreeNameInput = $("new-tree-name");
const newTreeFamilyInput = $("new-tree-family");
const newTreeCancelBtn = $("new-tree-cancel");
const newTreeMessage = $("new-tree-message");

const sidebarTreeList = $("sidebar-tree-list");
const sidebarNewTree = $("sidebar-new-tree");
const sidebarUsername = $("sidebar-username");
const sidebarLogout = $("sidebar-logout");

const treeView = $("tree-view");
const treeTitleEl = $("tree-title");
const familyNameInput = $("family-name-input");

const treeScrollEl = $("tree-scroll");
const treeCanvasEl = $("tree-canvas");
const connectionsEl = $("connections-layer");
const treeRootEl = $("tree-root");

// Context Menu
const contextMenu = $("context-menu");
const menuAddChild = $("menu-add-child");
const menuAddSpouse = $("menu-add-spouse");
const menuDelete = $("menu-delete");

// Tree Context Menu
const treeContextMenu = $("tree-context-menu");
const menuEditTreeName = $("menu-edit-tree-name");
const menuDeleteTree = $("menu-delete-tree");

// Modal Add Form
const addModalOverlay = $("add-modal-overlay");
const modalCloseBtn = $("modal-close-btn");
const addFormEl = $("add-member-form");
const modalActionType = $("modal-action-type");
const modalTargetId = $("modal-target-id");
const addNameInput = $("member-fullname");
const addGenderSelect = $("member-gender");
const addFormMessage = $("form-message");
const modalTitle = $("modal-title");

// Search Bar
const treeSearchInput = $("tree-search-input");
const treeSearchBtn = $("tree-search-btn");

const personPanel = $("person-panel");
const backToTreeBtn = $("back-to-tree");
const personFormEl = $("person-form");
const personFullNameInput = $("person-fullname");
const personBirthdayInput = $("person-birthday");
const personDeathDateInput = $("person-deathdate");
const personDeathUnknown = $("person-death-unknown");
const personSpouseSel = $("person-spouse");
const personAdditionalInput = $("person-additional");
const personMessage = $("person-message");
const infoFullnameEl = $("info-fullname");
const infoGenderEl = $("info-gender");
const infoAgeEl = $("info-age");
const infoAdditionalEl = $("info-additional");

// ==================== App State ====================

let currentUser = null;   // username string
let userData = null;   // { trees: [...], nextTreeId }
let activeTreeId = null;   // currently selected tree id
let activePersonId = null;  // currently viewed person id
let drawRaf = 0;
let currentZoom = 1.0;     // scale factor for the tree canvas

// ==================== Page Switching ====================

function showPage(page) {
  [authPage, welcomePage, newTreePage, dashboard].forEach(p => p.classList.add("hidden"));
  page.classList.remove("hidden");
}

function showDashboardView(view) {
  treeView.classList.add("hidden");
  personPanel.classList.add("hidden");
  if (view === "tree") {
    treeView.classList.remove("hidden");
    scheduleDrawLines();
  } else if (view === "person") {
    personPanel.classList.remove("hidden");
  }
}

// ==================== Auth Tab Switching ====================

tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  showMsg(loginMessage, null, "");
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  showMsg(registerMessage, null, "");
});



// ==================== Register ====================

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("register-email").value.trim();
  const username = $("register-username").value.trim();
  const password = $("register-password").value;
  const confirm = $("register-confirm").value;

  if (!email) { showMsg(registerMessage, "error", "Email is required."); return; }
  if (!username) { showMsg(registerMessage, "error", "Username is required."); return; }
  if (username.length < 3) { showMsg(registerMessage, "error", "Username must be at least 3 characters."); return; }
  if (!password) { showMsg(registerMessage, "error", "Password is required."); return; }
  if (password.length < 8) { showMsg(registerMessage, "error", "Password must be at least 8 characters."); return; }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    showMsg(registerMessage, "error", "Password must be a combination of letters and numbers.");
    return;
  }
  if (password !== confirm) { showMsg(registerMessage, "error", "Passwords do not match."); return; }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    showMsg(registerMessage, "error", error.message);
    return;
  }

  // Insert into profiles
  if (data.user) {
    await supabase.from('profiles').insert({ id: data.user.id, username: username });
  }

  currentUser = username;
  userData = { trees: [] };
  welcomeNameEl.textContent = username;
  showPage(welcomePage);
  registerForm.reset();
});

// ==================== Login ====================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  if (!email || !password) { showMsg(loginMessage, "error", "Please fill in all fields."); return; }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showMsg(loginMessage, "error", "Invalid email or password.");
    return;
  }

  // Pull the username from profiles to display on the dashboard
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.user.id).single();
  currentUser = profile ? profile.username : email.split('@')[0];

  loginForm.reset();

  await fetchUserData();
  enterDashboard();
});

// ==================== Logout ====================

sidebarLogout.addEventListener("click", async () => {
  await supabase.auth.signOut();
  currentUser = null;
  userData = null;
  activeTreeId = null;
  activePersonId = null;
  showPage(authPage);
});

// ==================== Welcome Page ====================

welcomeCreateBtn.addEventListener("click", () => {
  showPage(newTreePage);
  newTreeNameInput.value = "";
  newTreeFamilyInput.value = "";
  showMsg(newTreeMessage, null, "");
  newTreeCancelBtn.classList.add("hidden"); // Hide cancel on first tree
});

// ==================== New Tree Page ====================

newTreeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = newTreeNameInput.value.trim();
  const familyName = newTreeFamilyInput.value.trim();
  if (!name) { showMsg(newTreeMessage, "error", "Please enter a tree name."); return; }
  if (!familyName) { showMsg(newTreeMessage, "error", "Please enter the family surname."); return; }

  const { data: { user } } = await supabase.auth.getUser();

  const tree = {
    id: uuidv4(),
    name,
    familyName,
    members: []
  };

  // Push physical tree to Supabase
  await supabase.from('trees').insert({
    id: tree.id,
    user_id: user.id,
    family_name: `${name}|||${familyName}` // Serialized to bypass strict schema constraints
  });

  userData.trees.push(tree);

  activeTreeId = tree.id;
  newTreeForm.reset();
  enterDashboard();
});

newTreeCancelBtn.addEventListener("click", () => {
  // Go back to dashboard if user has trees
  if (userData && userData.trees.length > 0) {
    enterDashboard();
  }
});

// ==================== Enter Dashboard ====================

function enterDashboard() {
  showPage(dashboard);
  sidebarUsername.textContent = currentUser;

  // If no active tree, pick the first one
  if (!activeTreeId && userData.trees.length > 0) {
    activeTreeId = userData.trees[0].id;
  }

  renderSidebar();
  if (activeTreeId) {
    loadTree(activeTreeId);
  }
  showDashboardView("tree");
}

// ==================== Sidebar ====================

sidebarNewTree.addEventListener("click", () => {
  showPage(newTreePage);
  newTreeNameInput.value = "";
  newTreeFamilyInput.value = "";
  showMsg(newTreeMessage, null, "");
  newTreeCancelBtn.classList.remove("hidden");
});

function renderSidebar() {
  sidebarTreeList.innerHTML = "";
  userData.trees.forEach((tree) => {
    const item = document.createElement("div");
    item.className = "sidebar-tree-item" + (tree.id === activeTreeId ? " active" : "");
    item.textContent = tree.name;
    item.title = tree.name;
    item.dataset.treeId = String(tree.id);

    item.addEventListener("click", () => {
      activeTreeId = tree.id;
      activePersonId = null;
      renderSidebar();
      loadTree(tree.id);
      showDashboardView("tree");
    });

    // Right-click to show tree context menu
    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();

      // Position the tree menu
      treeContextMenu.style.left = `${e.pageX}px`;
      treeContextMenu.style.top = `${e.pageY}px`;
      treeContextMenu.dataset.targetId = String(tree.id);
      treeContextMenu.classList.remove("hidden");
    });

    sidebarTreeList.appendChild(item);
  });
}

// ==================== Load / Get Active Tree ====================

function getActiveTree() {
  if (!userData || !activeTreeId) return null;
  return userData.trees.find(t => t.id === activeTreeId) || null;
}

function loadTree(treeId) {
  activeTreeId = treeId;
  const tree = getActiveTree();
  if (!tree) return;
  treeTitleEl.textContent = tree.name;
  familyNameInput.value = tree.familyName || "";

  if (tree.familyName) {
    lockFamilyName();
  } else {
    unlockFamilyName();
  }

  renderTree();
}

// Family name Save / Edit button logic
const fnEditBtn = $("fn-edit-btn");
const fnSaveBtn = $("fn-save-btn");

function lockFamilyName() {
  familyNameInput.setAttribute("readonly", "");
  fnEditBtn.classList.remove("hidden");
  fnSaveBtn.classList.add("hidden");
}

function unlockFamilyName() {
  familyNameInput.removeAttribute("readonly");
  fnEditBtn.classList.add("hidden");
  fnSaveBtn.classList.remove("hidden");
  familyNameInput.focus();
}

fnEditBtn.addEventListener("click", () => {
  unlockFamilyName();
});

fnSaveBtn.addEventListener("click", async () => {
  const tree = getActiveTree();
  if (!tree) return;
  const newFn = familyNameInput.value.trim();
  tree.familyName = newFn;

  await supabase.from('trees').update({
    family_name: `${tree.name}|||${tree.familyName}`
  }).eq('id', tree.id);

  autoSave();
  lockFamilyName();
});

async function autoSave() {
  const tree = getActiveTree();
  if (!tree || !currentUser) return;

  const payloads = tree.members.map(m => ({
    id: m.id,
    tree_id: tree.id,
    full_name: m.fullName || m.name || "Unknown",
    gender: m.gender,
    birthday: m.birthday,
    birth_year: m.birthYear,
    death_date: m.deathDate,
    death_unknown: m.deathUnknown,
    parent_id: m.parentId,
    spouse_id: m.spouseId,
    additional_info: m.additionalInfo
  }));

  if (payloads.length > 0) {
    await supabase.from('members').upsert(payloads);
  }
}

// ==================== Helpers ====================

function getMemberById(id) {
  const tree = getActiveTree();
  if (!tree || id == null) return null;
  return tree.members.find(m => m.id === id) || null;
}

function getMembers() {
  const tree = getActiveTree();
  return tree ? tree.members : [];
}

function wouldCreateCycle(memberId, potentialParentId) {
  let current = getMemberById(potentialParentId);
  while (current) {
    if (current.id === memberId) return true;
    current = current.parentId == null ? null : getMemberById(current.parentId);
  }
  return false;
}

function populateMemberSelect(selectEl, options) {
  const excludeSet = new Set(options.excludeIds || []);
  selectEl.innerHTML = "";
  const noneOpt = document.createElement("option");
  noneOpt.value = "";
  noneOpt.textContent = options.noneLabel;
  selectEl.appendChild(noneOpt);
  getMembers().forEach(m => {
    if (excludeSet.has(m.id)) return;
    const opt = document.createElement("option");
    opt.value = String(m.id);
    opt.textContent = m.name;
    selectEl.appendChild(opt);
  });
}

function populateAddFormSelects() {
  populateMemberSelect(addParentSelect, { noneLabel: "No parent (new root)" });
  populateMemberSelect(addSpouseSelect, { noneLabel: "No spouse" });
}

function populatePersonFormSelects(personId) {
  populateMemberSelect(personSpouseSel, { noneLabel: "No spouse", excludeIds: [personId] });
}

// ==================== Context Menu & Modal Logic ====================

// Hide context menu on outside click
document.addEventListener("click", () => {
  contextMenu.classList.add("hidden");
  treeContextMenu.classList.add("hidden");
});

// Right-click on tree
treeRootEl.addEventListener("contextmenu", (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;

  const card = target.closest(".member-card");
  if (!card) return; // Allow normal right-click if not on a card

  e.preventDefault();

  const id = Number(card.dataset.memberId);
  if (!id) return;

  // Position the menu
  contextMenu.style.left = `${e.pageX}px`;
  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.dataset.targetId = String(id);
  contextMenu.classList.remove("hidden");
});

function openAddModal(actionType, targetId) {
  modalActionType.value = actionType;
  modalTargetId.value = String(targetId);

  const targetName = getMemberById(targetId)?.name || "Unknown";
  modalTitle.textContent = actionType === "child" ? `Add Child for ${targetName}` : `Add Spouse for ${targetName}`;

  addNameInput.value = "";
  addGenderSelect.value = "male";
  showMsg(addFormMessage, null, "");

  addModalOverlay.classList.remove("hidden");
  addNameInput.focus();
}

menuAddChild.addEventListener("click", () => {
  const id = contextMenu.dataset.targetId;
  const member = getMemberById(id);
  if (!member) return;

  if (member.spouseId == null) {
    alert("This member must have a spouse before you can add a child for them!");
    return;
  }

  const spouse = getMemberById(member.spouseId);
  if (!spouse) return;

  if (!member.birthday) {
    alert(`Please confirm ${member.fullName || member.name || "this member"}'s birthday in their details panel first!`);
    return;
  }

  if (!spouse.birthday) {
    alert(`Please confirm spouse ${spouse.fullName || spouse.name || "their spouse"}'s birthday in their details panel first!`);
    return;
  }

  const age1 = calculateAge(member.birthYear);
  const age2 = calculateAge(spouse.birthYear);

  if (age1 < 18 || age2 < 18) {
    alert("Both parents must be at least 18 years old to have a child.");
    return;
  }

  openAddModal("child", id);
});

menuAddSpouse.addEventListener("click", () => {
  const id = contextMenu.dataset.targetId;
  const member = getMemberById(id);
  if (!member) return;

  if (!member.birthday) {
    alert("Please confirm this member's birthday in their details panel first!");
    return;
  }
  const age = calculateAge(member.birthYear);
  if (age < 18) {
    alert("Member must be at least 18 years old to have a spouse.");
    return;
  }

  openAddModal("spouse", id);
});

menuDelete.addEventListener("click", async () => {
  const id = contextMenu.dataset.targetId;
  if (!id) return;
  const member = getMemberById(id);
  if (!member) return;

  const tree = getActiveTree();
  if (!tree) return;

  // Prevent deleting if the member has children
  const hasChildren = tree.members.some(m => m.parentId === id);
  if (hasChildren) {
    alert("You cannot delete a member who has children. Please delete their children first.");
    return;
  }

  const nameToUse = member.fullName || member.realName || member.name || "Unknown";
  if (!confirm(`Delete "${nameToUse}"? This cannot be undone.`)) return;

  // Delete from Postgres Backend
  await supabase.from('members').delete().eq('id', id);

  clearSpouse(id);
  tree.members.forEach(m => { if (m.parentId === id) m.parentId = null; });
  const idx = tree.members.findIndex(m => m.id === id);
  if (idx !== -1) tree.members.splice(idx, 1);

  if (activePersonId === id) {
    activePersonId = null;
    showDashboardView("tree");
  }

  autoSave();
  renderTree();
});

// ==================== Tree Context Menu Actions ====================

menuEditTreeName.addEventListener("click", async () => {
  const id = treeContextMenu.dataset.targetId;
  if (!id || !userData || !userData.trees) return;

  const tree = userData.trees.find(t => String(t.id) === String(id));
  if (!tree) return;

  const newName = prompt(`Enter new name for the tree:`, tree.name);
  if (newName && newName.trim().length > 0) {
    tree.name = newName.trim();

    await supabase.from('trees').update({
      family_name: `${tree.name}|||${tree.familyName || ""}`
    }).eq('id', tree.id);

    renderSidebar();

    // If it's the active tree, update title
    if (activeTreeId === id) {
      if (typeof treeTitleEl !== "undefined" && treeTitleEl) {
        treeTitleEl.textContent = tree.name;
      }
    }
  }

  treeContextMenu.classList.add("hidden");
});

menuDeleteTree.addEventListener("click", async () => {
  const id = treeContextMenu.dataset.targetId;
  if (!id || !userData || !userData.trees) return;

  const tree = userData.trees.find(t => String(t.id) === String(id));
  if (!tree) return;

  if (!confirm(`Delete entire tree "${tree.name}"? This cannot be undone.`)) {
    treeContextMenu.classList.add("hidden");
    return;
  }

  await supabase.from('trees').delete().eq('id', tree.id);

  const idx = userData.trees.findIndex(x => String(x.id) === String(id));
  if (idx !== -1) {
    userData.trees.splice(idx, 1);
    if (activeTreeId === id) {
      activeTreeId = null;
      activePersonId = null;
      enterDashboard(); // reset view to first available tree or empty state
    } else {
      renderSidebar();
    }
  }

  treeContextMenu.classList.add("hidden");
});

modalCloseBtn.addEventListener("click", () => {
  addModalOverlay.classList.add("hidden");
});

// Calculate age relative to current year
function calculateAge(birthYear) {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}

addFormEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const tree = getActiveTree();
  if (!tree) return;

  const fullName = addNameInput.value.trim();
  const gender = addGenderSelect.value === "female" ? "female" : "male";
  const actionType = modalActionType.value;
  const targetId = Number(modalTargetId.value) || null; // Could be null for first root member

  if (!fullName) { showMsg(addFormMessage, "error", "Please enter a full name."); return; }

  const targetMember = targetId ? getMemberById(targetId) : null;

  // Validation handled mostly in context menu now via alerts.
  // But modal submit still checks spouse gender mismatch.
  if (actionType === "spouse" && targetMember) {
    if (targetMember.gender === gender) {
      showMsg(addFormMessage, "error", "Spouse must be a different gender.");
      return;
    }
  }

  const newMember = {
    id: tree.nextMemberId++,
    fullName: fullName,
    birthday: null,
    birthYear: null,
    gender,
    parentId: actionType === "child" ? targetId : null,
    spouseId: null,
    additionalInfo: ""
  };

  tree.members.push(newMember);

  if (actionType === "spouse" && targetMember) {
    setSpouse(newMember.id, targetMember.id);
  }

  autoSave();
  renderTree();

  addModalOverlay.classList.add("hidden");
});

// Removed redundant add-first-member-btn listener since it's merged in the general click handler

// ==================== Search System ====================

function handleSearch() {
  const query = treeSearchInput.value.trim().toLowerCase();

  // Clear existing highlights
  document.querySelectorAll(".highlight-glow").forEach(el => el.classList.remove("highlight-glow"));

  if (!query) return;

  const tree = getActiveTree();
  if (!tree) return;

  // First pass: try matching just their specific full name (ignoring family surname)
  let matches = tree.members.filter(m => {
    const specificName = (m.fullName || m.name || "").toLowerCase();
    return specificName.includes(query);
  });

  // Second pass fallback: if no matches, or if the user is explicitly searching a surname, include the global surname
  if (matches.length === 0) {
    matches = tree.members.filter(m => {
      const fullWithSurname = getFullName(m, tree).toLowerCase();
      return fullWithSurname.includes(query);
    });
  }

  if (matches.length === 0) {
    alert("No family member found");
    return;
  }

  // Highlight all matched DOM cards
  let firstCard = null;
  matches.forEach(match => {
    const card = document.querySelector(`.member-card[data-member-id="${match.id}"]`);
    if (!card) return;

    card.classList.add("highlight-glow");
    if (!firstCard) firstCard = card;

    setTimeout(() => {
      card.classList.remove("highlight-glow");
    }, 3000);
  });

  if (!firstCard) return;

  // Auto-pan / scroll to the FIRST card
  const scrollRect = treeScrollEl.getBoundingClientRect();
  const cardRect = firstCard.getBoundingClientRect();

  const cardCenterX = cardRect.left + (cardRect.width / 2);
  const cardCenterY = cardRect.top + (cardRect.height / 2);

  const viewCenterX = scrollRect.left + (scrollRect.width / 2);
  const viewCenterY = scrollRect.top + (scrollRect.height / 2);

  treeScrollEl.scrollBy({
    left: cardCenterX - viewCenterX,
    top: cardCenterY - viewCenterY,
    behavior: "smooth"
  });
}

treeSearchBtn.addEventListener("click", handleSearch);
treeSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});

// ==================== Zoom System ====================

function applyZoom() {
  // Clamp zoom between 0.3 and 2.5
  currentZoom = Math.max(0.3, Math.min(currentZoom, 2.5));

  // Apply visual scale
  treeCanvasEl.style.transform = `scale(${currentZoom})`;

  // Apply visibility classes to treeRootEl based on scale
  treeRootEl.classList.remove("zoom-low", "zoom-mid", "zoom-high");
  if (currentZoom < 0.7) {
    treeRootEl.classList.add("zoom-low");
  } else if (currentZoom <= 1.2) {
    treeRootEl.classList.add("zoom-mid");
  } else {
    treeRootEl.classList.add("zoom-high");
  }

  // Lines need redrawing if container effectively changed size or we rely on bounds,
  // but since SVG is inside the scaled container, the relative coordinates remain identical!
  // No need to scheduleDrawLines() for CSS transform scale.
}

// Mouse wheel / Pinch to zoom
treeScrollEl.addEventListener("wheel", (e) => {
  // Check if ctrlKey is pressed (standard for pinch-to-zoom or ctrl+scroll)
  if (e.ctrlKey) {
    e.preventDefault(); // prevent native browser zoom
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    currentZoom += zoomDelta;
    applyZoom();
  }
}, { passive: false });

// Optional: Reset zoom on double click
treeCanvasEl.addEventListener("dblclick", (e) => {
  if (e.target.closest(".member-card")) return; // Don't reset if clicking a card
  currentZoom = 1.0;
  applyZoom();
});

// Initialize zoom classes
applyZoom();

// ==================== Tree Rendering (Grouped Spouses) ====================

function buildTree() {
  const members = getMembers();
  const map = new Map();

  // Clone members
  members.forEach(m => map.set(m.id, { ...m, children: [], handledAsSpouse: false }));

  // Collect children
  map.forEach(node => {
    if (node.parentId == null) return;
    const parent = map.get(node.parentId);
    if (parent) parent.children.push(node);
  });

  const roots = [];

  // Create family nodes (grouping spouses)
  map.forEach(node => {
    // If handled already via spouse, skip
    if (node.handledAsSpouse) return;

    const isRoot = node.parentId == null;
    let spouseNode = null;

    if (node.spouseId) {
      spouseNode = map.get(node.spouseId);
      if (spouseNode) {
        spouseNode.handledAsSpouse = true;
      }
    }

    // We only attach to roots if AT LEAST ONE of the spouses is a root.
    if (isRoot) {
      if (node.gender === "male" && spouseNode && spouseNode.gender === "female") {
        roots.push({ primary: spouseNode, spouse: node });
      } else {
        roots.push({ primary: node, spouse: spouseNode });
      }
    }
  });

  return roots;
}

function createCardHTML(node) {
  const isRoot = node.parentId == null;
  const isLeaf = node.children && node.children.length === 0;
  const depthClass = isRoot ? " node-root" : (isLeaf ? " node-leaf" : " node-branch");

  const meta = isRoot ? "Root" : (node.gender === "female" ? "Female" : "Male");
  const rootClass = isRoot ? " root" : "";
  const genderClass = node.gender === "female" ? "gender-female" : "gender-male";
  const displayFullName = node.fullName || node.realName || node.name || "Unknown";

  return `
    <div class="member-card ${genderClass}${depthClass}" data-member-id="${node.id}" role="button" tabindex="0" title="Right-click for options">
      <div class="member-name">${displayFullName}</div>
      <div class="member-meta${rootClass}">${meta}</div>
    </div>
  `;
}

function createTreeList(families) {
  const ul = document.createElement("ul");
  families.forEach(fam => {
    const li = document.createElement("li");

    const familyNode = document.createElement("div");
    familyNode.className = "family-node";

    // Render primary card
    familyNode.innerHTML += createCardHTML(fam.primary);

    // Render spouse card if exists
    if (fam.spouse) {
      familyNode.innerHTML += createCardHTML(fam.spouse);
    }

    li.appendChild(familyNode);

    // Collect all children from both spouses
    const allChildren = [...fam.primary.children, ...(fam.spouse ? fam.spouse.children : [])];

    if (allChildren.length > 0) {
      // Re-map children into family structures for recursion
      const members = getMembers();
      const childFamilies = [];
      const handled = new Set();

      allChildren.forEach(child => {
        if (handled.has(child.id)) return;
        handled.add(child.id);

        // Find if this child has a spouse
        let sNode = null;
        if (child.spouseId) {
          const rawSpouse = members.find(m => m.id === child.spouseId);
          if (rawSpouse) {
            // Re-create the structure since we only have the map locally in buildTree
            sNode = { ...rawSpouse, children: members.filter(m => m.parentId === rawSpouse.id) };
            handled.add(sNode.id);
          }
        }

        let primaryChild = { ...child, children: members.filter(m => m.parentId === child.id) };

        if (primaryChild.gender === "male" && sNode && sNode.gender === "female") {
          childFamilies.push({ primary: sNode, spouse: primaryChild });
        } else {
          childFamilies.push({ primary: primaryChild, spouse: sNode });
        }
      });

      li.appendChild(createTreeList(childFamilies));
    }
    ul.appendChild(li);
  });
  return ul;
}

function renderTree() {
  treeRootEl.innerHTML = "";
  const treeInfo = buildTree();

  if (treeInfo.length === 0) {
    const container = document.createElement("div");
    container.style.textAlign = "center";
    container.style.padding = "40px";
    container.style.transform = "rotate(180deg)"; // Unflip the text since the tree is rotated 180deg
    container.innerHTML = `
      <p style="color: var(--text-muted); margin-bottom: 20px;">No family members yet.</p>
      <button class="btn-primary" id="add-first-member-btn">Add First Member</button>
    `;
    treeRootEl.appendChild(container);
    return;
  }

  const container = document.createElement("div");
  container.className = "tree";
  container.appendChild(createTreeList(treeInfo));
  treeRootEl.appendChild(container);

  scheduleDrawLines();
}

// Combined Click Handler for treeRootEl
treeRootEl.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;

  // 1. Handle "Add First Member" button
  if (target.id === "add-first-member-btn") {
    openAddModal("root", null);
    modalTitle.textContent = "Add First Family Member";
    return;
  }

  // 2. Handle clicking a Member Card
  const card = target.closest(".member-card");
  if (!card) return;
  const id = card.dataset.memberId;
  if (!id) return;
  openPerson(id);
});

treeRootEl.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const target = e.target;
  if (!(target instanceof Element)) return;
  const card = target.closest(".member-card");
  if (!card) return;
  e.preventDefault();
  openPerson(card.dataset.memberId);
});

// ==================== Person Detail ====================

function openPerson(id) {
  const member = getMemberById(id);
  if (!member) return;
  activePersonId = id;
  const tree = getActiveTree();

  populatePersonFormSelects(id);
  personFullNameInput.value = member.fullName || member.realName || member.name || "";
  personBirthdayInput.value = member.birthday || "";
  personDeathDateInput.value = member.deathDate || "";
  personDeathUnknown.checked = !!member.deathUnknown;
  personSpouseSel.value = member.spouseId == null ? "" : String(member.spouseId);
  personAdditionalInput.value = member.additionalInfo || "";

  // Update info panel
  updateInfoPanel(member, tree);

  showMsg(personMessage, null, "");
  showDashboardView("person");
}

function getFullName(member, tree) {
  const base = tree ? tree.familyName || "" : "";
  const surname = (member.gender === "female" && base) ? base + "a" : base;
  const nameToUse = member.fullName || member.realName || member.name;
  return surname ? `${nameToUse} ${surname}` : nameToUse;
}

function updateInfoPanel(member, tree) {
  // Full name: FamilyName(+a if female) RealName
  infoFullnameEl.textContent = getFullName(member, tree);

  // Gender
  infoGenderEl.textContent = member.gender === "female" ? "Female" : "Male";

  // Birthday, age, death
  let bText = "";
  let bDateStr = "";
  if (member.birthday) {
    bDateStr = new Date(member.birthday).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  } else if (member.birthYear) {
    bDateStr = String(member.birthYear);
  }

  let dDateStr = "";
  if (member.deathUnknown) {
    dDateStr = "Unknown";
  } else if (member.deathDate) {
    dDateStr = new Date(member.deathDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }

  if (bDateStr && dDateStr) {
    bText = `${bDateStr} - ${dDateStr}`;
  } else if (bDateStr) {
    bText = bDateStr;
  } else if (dDateStr) {
    bText = `Unknown - ${dDateStr}`;
  } else {
    bText = "Not specified";
  }

  infoAgeEl.textContent = bText;

  // Additional Information
  if (member.additionalInfo && member.additionalInfo.trim()) {
    infoAdditionalEl.textContent = member.additionalInfo.trim();
  } else {
    infoAdditionalEl.textContent = "No additional information yet.";
  }
}

// Wait to see if birthday changed, but no birthYear input exists anymore.
// We just calculate age from birthday directly in updateInfoPanel.

backToTreeBtn.addEventListener("click", () => {
  activePersonId = null;
  showDashboardView("tree");
  renderTree();
});

personFormEl.addEventListener("submit", (e) => {
  e.preventDefault();
  if (activePersonId == null) return;
  const member = getMemberById(activePersonId);
  if (!member) return;

  const newFullName = personFullNameInput.value.trim();
  const newBirthday = personBirthdayInput.value || null;
  const newDeathDate = personDeathDateInput.value || null;
  const newDeathUnknown = personDeathUnknown.checked;
  const newSpouseId = personSpouseSel.value === "" ? null : personSpouseSel.value;
  const newAdditional = personAdditionalInput.value.trim();

  if (!newFullName) { showMsg(personMessage, "error", "Full name cannot be empty."); return; }

  if (newSpouseId != null && !getMemberById(newSpouseId)) {
    showMsg(personMessage, "error", "Spouse not found."); return;
  }

  // Derive birthYear entirely from birthday if it exists
  let derivedBirthYear = null;
  if (newBirthday) {
    const d = new Date(newBirthday);
    if (!isNaN(d.getTime())) {
      derivedBirthYear = d.getUTCFullYear();

      const newAge = calculateAge(derivedBirthYear);

      let newDeathYear = null;
      if (newDeathDate) {
        const dd = new Date(newDeathDate);
        if (!isNaN(dd.getTime())) newDeathYear = dd.getUTCFullYear();
      }

      // Enforce Death Year if >= 120
      if (newAge >= 120 && newDeathDate == null && !newDeathUnknown) {
        showMsg(personMessage, "error", "Members aged 120+ must have a Death Date or be marked 'Unknown'.");
        return;
      }

      // 1. Must be >= 18 to have a spouse
      if (member.spouseId != null && newAge < 18) {
        showMsg(personMessage, "error", "This member has a spouse, so they must be at least 18.");
        return;
      }

      // 2. Parent-Child gap check (Children must be 18+ years younger)
      const tree = getActiveTree();
      if (tree) {
        // Did we become too young compared to an existing child?
        const children = tree.members.filter(m => m.parentId === member.id);
        for (const child of children) {
          if (child.birthYear && child.birthYear - derivedBirthYear < 18) {
            showMsg(personMessage, "error", "Member must be at least 18 years older than their children.");
            return;
          }
        }

        // Did we become too old compared to an existing parent?
        if (member.parentId) {
          const parent = getMemberById(member.parentId);
          if (parent && parent.birthYear && derivedBirthYear - parent.birthYear < 18) {
            showMsg(personMessage, "error", "Member must be at least 18 years younger than their parent.");
            return;
          }
        }
      }
    }
  }

  member.fullName = newFullName;
  // delete legacy fields if they exist to clean up data over time
  delete member.name;
  delete member.realName;

  member.birthday = newBirthday;
  member.birthYear = derivedBirthYear;
  member.deathDate = newDeathDate;
  member.deathUnknown = newDeathUnknown;

  // Legacy cleanup from previous iteration
  delete member.deathYear;

  // member.gender remains unchanged
  member.additionalInfo = newAdditional;

  if (newSpouseId == null) { clearSpouse(member.id); }
  else { setSpouse(member.id, newSpouseId); }

  autoSave();
  renderTree();
  openPerson(member.id);
  showMsg(personMessage, "success", "Saved.");
});

// ==================== Spouse Helpers ====================

function clearSpouse(memberId) {
  const member = getMemberById(memberId);
  if (!member || member.spouseId == null) return;
  const spouse = getMemberById(member.spouseId);
  member.spouseId = null;
  if (spouse && spouse.spouseId === memberId) spouse.spouseId = null;
}

function setSpouse(aId, bId) {
  if (aId === bId) return;
  const a = getMemberById(aId);
  const b = getMemberById(bId);
  if (!a || !b) return;
  clearSpouse(aId);
  clearSpouse(bId);
  a.spouseId = bId;
  b.spouseId = aId;
}

// ==================== Simple Connection Lines ====================

function scheduleDrawLines() {
  if (drawRaf) cancelAnimationFrame(drawRaf);
  drawRaf = requestAnimationFrame(drawSimpleLines);
}

function drawSimpleLines() {
  drawRaf = 0;
  connectionsEl.innerHTML = `
    <defs>
      <!-- Rough woody bark texture filter -->
      <filter id="barkFilter" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04 0.15" numOctaves="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      
      <!-- Linear gradient for trunk shading -->
      <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3d2c20" />
        <stop offset="50%" stop-color="#5c4535" />
        <stop offset="100%" stop-color="#3d2c20" />
      </linearGradient>
      
      <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#5c4535" />
        <stop offset="50%" stop-color="#7a5d48" />
        <stop offset="100%" stop-color="#5c4535" />
      </linearGradient>
    </defs>
  `;

  const treeContainer = treeRootEl.querySelector(".tree");
  if (!treeContainer) return;

  const canvasRect = treeCanvasEl.getBoundingClientRect();
  const w = Math.max(1, Math.round(treeCanvasEl.scrollWidth));
  const h = Math.max(1, Math.round(treeCanvasEl.scrollHeight));
  connectionsEl.setAttribute("width", String(w));
  connectionsEl.setAttribute("height", String(h));
  connectionsEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
  connectionsEl.style.width = `${w}px`;
  connectionsEl.style.height = `${h}px`;

  // Map memberId → card element
  const cardById = new Map();
  treeRootEl.querySelectorAll(".member-card").forEach(el => {
    const id = el.dataset.memberId;
    if (id) cardById.set(id, el);
  });

  function getCenter(el) {
    const r = el.getBoundingClientRect();
    return {
      x: r.left - canvasRect.left + r.width / 2,
      yTop: r.top - canvasRect.top,
      yBot: r.bottom - canvasRect.top,
      xLeft: r.left - canvasRect.left,
      xRight: r.right - canvasRect.left,
      yCen: r.top - canvasRect.top + r.height / 2
    };
  }

  const depthCache = new Map();
  function getDepth(id) {
    if (depthCache.has(id)) return depthCache.get(id);
    const m = getMemberById(id);
    if (!m || !m.parentId) {
      depthCache.set(id, 0);
      return 0;
    }
    const d = getDepth(m.parentId) + 1;
    depthCache.set(id, d);
    return d;
  }

  function generateLeafCluster(cx, cy, scale) {
    // Generate a cluster of overlapping semi-transparent circles/paths to resemble foliage
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const count = Math.floor(6 + Math.random() * 8); // 6 to 13 leaves per cluster
    for (let i = 0; i < count; i++) {
      const leaf = document.createElementNS("http://www.w3.org/2000/svg", "circle");

      // Random offset from center point, scaled by desired canopy size
      const ox = (Math.random() - 0.5) * 80 * scale;
      const oy = (Math.random() - 0.5) * 60 * scale;

      leaf.setAttribute("cx", String((cx / currentZoom) + ox));
      leaf.setAttribute("cy", String((cy / currentZoom) + oy));

      // Random size for each leaf blob
      const r = (15 + Math.random() * 25) * scale;
      leaf.setAttribute("r", String(r));

      // Various shades of green and yellow-green for depth
      const colors = ["#446b3e", "#53824b", "#639959", "#72aa67"];
      const fill = colors[Math.floor(Math.random() * colors.length)];

      leaf.setAttribute("fill", fill);
      leaf.setAttribute("opacity", String(0.65 + Math.random() * 0.2));

      group.appendChild(leaf);
    }
    connectionsEl.appendChild(group);
  }

  function addCurve(x1, y1, x2, y2, colorObj, thickness, dash) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    // scale coordinates backward by currentZoom so it matches native container pixels
    x1 /= currentZoom; y1 /= currentZoom;
    x2 /= currentZoom; y2 /= currentZoom;

    // Smooth bezier curve for organic tree branches.
    const cy = y1 + (y2 - y1) / 2;
    const d = `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;

    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", colorObj.url || colorObj.hex);
    path.setAttribute("stroke-width", String(thickness || 2));
    path.setAttribute("stroke-linecap", "round");

    // Apply bark texture filter to organic branches
    if (colorObj.url) {
      path.setAttribute("filter", "url(#barkFilter)");
    }

    if (dash) path.setAttribute("stroke-dasharray", dash);
    connectionsEl.appendChild(path);
  }

  function addLine(x1, y1, x2, y2, color, dash) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(x1 / currentZoom));
    line.setAttribute("y1", String(y1 / currentZoom));
    line.setAttribute("x2", String(x2 / currentZoom));
    line.setAttribute("y2", String(y2 / currentZoom));
    line.setAttribute("stroke", color || "rgba(108, 99, 255, 0.35)");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-linecap", "round");
    if (dash) line.setAttribute("stroke-dasharray", dash);
    connectionsEl.appendChild(line);
  }

  // Find centers for all family nodes
  const familyNodes = Array.from(document.querySelectorAll('.family-node'));
  const familyCenters = new Map(); // Map parent ID to their visually grouped midpoint bottom

  familyNodes.forEach(node => {
    const cards = Array.from(node.querySelectorAll('.member-card'));
    if (cards.length === 0) return;

    const rects = cards.map(c => {
      const r = c.getBoundingClientRect();
      const id = c.dataset.memberId;
      return { id, rect: r };
    });

    const containerRect = treeCanvasEl.getBoundingClientRect();

    // Determine the bottom-center starting point for children
    let startX, startY;
    if (rects.length === 1) {
      // Single parent (Line stems from visually TOP of card in a rotated tree)
      startX = rects[0].rect.left + rects[0].rect.width / 2 - containerRect.left;
      startY = rects[0].rect.top - containerRect.top;
      familyCenters.set(rects[0].id, { x: startX, y: startY });
    } else if (rects.length === 2) {
      // Spouses: line stems from exactly halfway between them, from visually TOP
      const leftRect = rects[0].rect.left < rects[1].rect.left ? rects[0].rect : rects[1].rect;
      const rightRect = rects[0].rect.left < rects[1].rect.left ? rects[1].rect : rects[0].rect;

      startX = (leftRect.right + rightRect.left) / 2 - containerRect.left;
      startY = leftRect.top - containerRect.top; // Assuming same height

      familyCenters.set(rects[0].id, { x: startX, y: startY });
      familyCenters.set(rects[1].id, { x: startX, y: startY });

      // Draw horizontal dashed line between spouses
      addLine(
        leftRect.right - containerRect.left,
        leftRect.top + leftRect.height / 2 - containerRect.top,
        rightRect.left - containerRect.left,
        rightRect.top + rightRect.height / 2 - containerRect.top,
        "rgba(249, 168, 212, 0.45)", "5 5"
      );
    }
  });

  // Parent → Child: simple straight line from parent family bottom to child top
  getMembers().forEach(child => {
    if (child.parentId == null) return;

    const startPoint = familyCenters.get(child.parentId);
    if (!startPoint) return;

    const childCard = cardById.get(child.id);
    if (!childCard) return;

    const childRect = childCard.getBoundingClientRect();
    const containerRect = treeCanvasEl.getBoundingClientRect();
    const endX = childRect.left + childRect.width / 2 - containerRect.left;
    const endY = childRect.bottom - containerRect.top; // Arrive at visually BOTTOM of child

    const depth = getDepth(child.id);
    let colorObj = { hex: "rgba(108, 99, 255, 0.5)" };
    let thickness = 2;

    if (depth <= 1) {
      colorObj = { url: "url(#trunkGradient)", hex: "#4d3a2a" }; // thick trunk gradient
      thickness = 18;
    } else if (depth === 2) {
      colorObj = { url: "url(#branchGradient)", hex: "#6c533c" }; // medium branch gradient
      thickness = 10;
    } else if (depth === 3) {
      colorObj = { url: "url(#branchGradient)", hex: "#8a6d51" }; // thinner branch
      thickness = 6;

      // Starting to grow canopy leaves at depth 3
      generateLeafCluster(endX, endY, 0.8);
    } else {
      colorObj = { hex: "#a8896a" }; // thin twigs
      thickness = 4;

      // Huge dense canopy leaves at depth 4+
      generateLeafCluster(endX, endY, 1.4);
    }

    addCurve(startPoint.x, startPoint.y, endX, endY, colorObj, thickness);
  });
}

window.addEventListener("resize", scheduleDrawLines);

// ==================== Supabase Sync Engine ====================

async function fetchUserData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: treesData } = await supabase.from('trees').select('*').eq('user_id', user.id);
  const { data: membersData } = await supabase.from('members').select('*'); // RLS automatically filters

  userData = { trees: [] };

  if (treesData) {
    treesData.forEach(t => {
      // Split our serialized family_name string
      const [namePart, familyPart] = (t.family_name || "").split('|||');

      const treeMembers = (membersData || []).filter(m => m.tree_id === t.id).map(m => ({
        id: m.id,
        parentId: m.parent_id,
        spouseId: m.spouse_id,
        fullName: m.full_name,
        gender: m.gender,
        birthday: m.birthday,
        birthYear: m.birth_year,
        deathDate: m.death_date,
        deathUnknown: m.death_unknown,
        additionalInfo: m.additional_info
      }));

      userData.trees.push({
        id: t.id,
        name: namePart || t.family_name,
        familyName: familyPart || "",
        members: treeMembers
      });
    });
  }
}

// ==================== Init ====================

(async function init() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session && session.user) {
    // If we have an active session, pull profiles for display username
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
    currentUser = profile ? profile.username : session.user.email.split('@')[0];

    await fetchUserData();
    enterDashboard();
  } else {
    showPage(authPage);
  }
})();