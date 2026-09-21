/**
 * NourishFlow AI - Shared Navigation, Role State & Toast System
 */

// Available Roles
const ROLES = {
  donor: { name: 'Donor', label: 'Food Donor', icon: '🍲', home: 'donor.html' },
  receiver: { name: 'Receiver NGO', label: 'Receiver NGO', icon: '🏢', home: 'receiver.html' },
  volunteer: { name: 'Volunteer', label: 'Volunteer Courier', icon: '🚚', home: 'volunteer.html' },
  admin: { name: 'Admin', label: 'System Admin', icon: '📊', home: 'admin.html' },
};

export function getCurrentRole() {
  const saved = sessionStorage.getItem('nourishflow_role') || 'donor';
  return ROLES[saved] ? saved : 'donor';
}

export function setCurrentRole(roleKey) {
  if (ROLES[roleKey]) {
    sessionStorage.setItem('nourishflow_role', roleKey);
  }
}

export function renderNavbar(activePageKey = '') {
  const navContainer = document.getElementById('navbar-mount');
  if (!navContainer) return;

  const currentRoleKey = getCurrentRole();
  const roleObj = ROLES[currentRoleKey] || ROLES.donor;

  navContainer.innerHTML = `
    <nav class="navbar" id="app-navbar">
      <div class="nav-container">
        <a href="login.html" class="brand" id="nav-brand-link">
          <div class="brand-icon">🌱</div>
          <div>
            <div class="brand-name">Nourish<span>Flow</span> AI <span class="brand-tag">Urgency Match</span></div>
          </div>
        </a>

        <ul class="nav-links">
          <li>
            <a href="login.html" class="${activePageKey === 'login' ? 'active' : ''}" id="nav-link-login">
              <span>🌟</span> Roles
            </a>
          </li>
          <li>
            <a href="donor.html" class="${activePageKey === 'donor' ? 'active' : ''}" id="nav-link-donor">
              <span>🍲</span> Post Donation
            </a>
          </li>
          <li>
            <a href="receiver.html" class="${activePageKey === 'receiver' ? 'active' : ''}" id="nav-link-receiver">
              <span>🏢</span> Receiver Queue
            </a>
          </li>
          <li>
            <a href="volunteer.html" class="${activePageKey === 'volunteer' ? 'active' : ''}" id="nav-link-volunteer">
              <span>🚚</span> Volunteer Dispatch
            </a>
          </li>
          <li>
            <a href="admin.html" class="${activePageKey === 'admin' ? 'active' : ''}" id="nav-link-admin">
              <span>📊</span> Admin
            </a>
          </li>
        </ul>

        <div class="nav-actions">
          <div class="role-badge" title="Active demo role stored in session">
            <span class="pulse-dot"></span>
            Role: <strong>${roleObj.label}</strong>
          </div>
          <a href="login.html" class="btn btn-secondary btn-sm" id="nav-switch-role-btn">
            Switch
          </a>
        </div>
      </div>
    </nav>
  `;
}

// Global Toast System
export function showToast(message, type = 'amber') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const typeClass = type === 'coral' ? 'toast-coral' : type === 'success' ? 'toast-success' : '';
  toast.className = `toast ${typeClass}`;
  
  const icon = type === 'coral' ? '⚠️' : type === 'success' ? '✓' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Priority Badge HTML Builder
export function renderPriorityBadge(tier) {
  const t = tier || 'Medium';
  const lower = t.toLowerCase();
  let icon = '•';
  if (t === 'Critical') icon = '⚡';
  else if (t === 'High') icon = '⏱️';
  else if (t === 'Medium') icon = '📦';
  else if (t === 'Expired') icon = '⌛';

  return `<span class="badge-tier tier-${lower}">${icon} ${t}</span>`;
}

// Status Badge HTML Builder
export function renderStatusBadge(status) {
  const s = status || 'pending';
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return `<span class="badge-status status-${s}">${label}</span>`;
}
