// ============================================
// EcoWaste System - Shared JavaScript Utilities
// ============================================

// ============================================
// Constants
// ============================================
const CREDENTIALS = {
  resident: { username: 'resident', password: 'resident123' },
  admin: { username: 'admin', password: 'admin123' }
};

const STORAGE_KEYS = {
  COMPLAINTS: 'ecowaste_complaints',
  CURRENT_USER: 'ecowaste_current_user',
  COLLECTION_SCHEDULE: 'ecowaste_schedule'
};

const COMPLAINT_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved'
};

const WASTE_TYPES = {
  BIODEGRADABLE: 'Biodegradable',
  NON_BIODEGRADABLE: 'Non-Biodegradable',
  RECYCLABLE: 'Recyclable',
  HAZARDOUS: 'Hazardous'
};

const AREAS = [
  'Downtown',
  'North District',
  'South District',
  'East District',
  'West District',
  'Suburban Area',
  'Industrial Zone'
];

// ============================================
// Authentication Functions
// ============================================
function login(username, password, userType) {
  // First check default demo credentials
  const credentials = CREDENTIALS[userType];

  if (credentials && credentials.username === username && credentials.password === password) {
    const user = {
      username: username,
      type: userType,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return { success: true, user: user };
  }

  // Check registered users
  const users = JSON.parse(localStorage.getItem('ecowaste_users') || '[]');

  // Initialize admin/resident if not in local storage but credentials match
  if (!users.some(u => u.username === username)) {
    if (CREDENTIALS[userType] && CREDENTIALS[userType].username === username && CREDENTIALS[userType].password === password) {
      // Create default proofile for demo users
      const defaultUser = {
        username: username,
        type: userType,
        fullname: userType === 'admin' ? 'System Administrator' : 'John Doe',
        email: userType === 'admin' ? 'admin@ecowaste.com' : 'resident@example.com',
        points: 25, // Start with some points
        createdAt: new Date().toISOString()
      };
      users.push(defaultUser);
      localStorage.setItem('ecowaste_users', JSON.stringify(users));
      // Proceed to login with this new user
      const user = { ...defaultUser, loginTime: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return { success: true, user: user };
    }
  }
  const registeredUser = users.find(u => u.username === username && u.password === password && u.type === userType);

  if (registeredUser) {
    const user = {
      username: registeredUser.username,
      fullname: registeredUser.fullname,
      email: registeredUser.email,
      type: registeredUser.type,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return { success: true, user: user };
  }

  return { success: false, message: 'Invalid username or password' };
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  window.location.href = 'index.html';
}

function getCurrentUser() {
  const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return userStr ? JSON.parse(userStr) : null;
}

function requireAuth(requiredType) {
  const user = getCurrentUser();

  if (!user) {
    window.location.href = 'index.html';
    return null;
  }

  if (requiredType && user.type !== requiredType) {
    window.location.href = 'index.html';
    return null;
  }

  return user;
}

// ============================================
// Complaint Management Functions
// ============================================
function getAllComplaints() {
  const complaintsStr = localStorage.getItem(STORAGE_KEYS.COMPLAINTS);
  return complaintsStr ? JSON.parse(complaintsStr) : [];
}

function saveComplaint(complaintData) {
  const complaints = getAllComplaints();

  const complaint = {
    id: generateId(),
    ...complaintData,
    status: COMPLAINT_STATUS.PENDING,
    submittedBy: getCurrentUser()?.username || 'Anonymous',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  complaints.push(complaint);
  localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(complaints));

  return complaint;
}

function updateComplaintStatus(complaintId, newStatus) {
  const complaints = getAllComplaints();
  const index = complaints.findIndex(c => c.id === complaintId);

  if (index !== -1) {
    complaints[index].status = newStatus;
    complaints[index].updatedAt = new Date().toISOString();

    // Award points if resolved
    if (newStatus === COMPLAINT_STATUS.RESOLVED) {
      AWARD_POINTS(complaints[index].submittedBy, 50, 'Issue Resolved');
    }

    localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(complaints));
    return true;
  }

  return false;
}

function getComplaintsByArea(area) {
  return getAllComplaints().filter(c => c.location === area);
}

function getComplaintsByStatus(status) {
  return getAllComplaints().filter(c => c.status === status);
}

function getComplaintStats() {
  const complaints = getAllComplaints();

  return {
    total: complaints.length,
    pending: complaints.filter(c => c.status === COMPLAINT_STATUS.PENDING).length,
    inProgress: complaints.filter(c => c.status === COMPLAINT_STATUS.IN_PROGRESS).length,
    resolved: complaints.filter(c => c.status === COMPLAINT_STATUS.RESOLVED).length,
    byArea: getComplaintsByAreaStats(complaints)
  };
}

function getComplaintsByAreaStats(complaints) {
  const stats = {};
  AREAS.forEach(area => {
    stats[area] = complaints.filter(c => c.location === area).length;
  });
  return stats;
}

// ============================================
// Collection Schedule Functions
// ============================================
function getCollectionSchedule() {
  const scheduleStr = localStorage.getItem(STORAGE_KEYS.COLLECTION_SCHEDULE);

  if (scheduleStr) {
    return JSON.parse(scheduleStr);
  }

  // Initialize default schedule if not exists
  const defaultSchedule = generateDefaultSchedule();
  localStorage.setItem(STORAGE_KEYS.COLLECTION_SCHEDULE, JSON.stringify(defaultSchedule));
  return defaultSchedule;
}

function generateDefaultSchedule() {
  const schedule = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  AREAS.forEach((area, index) => {
    schedule.push({
      area: area,
      day: days[index % days.length],
      time: '08:00 AM',
      wasteType: index % 2 === 0 ? 'Biodegradable' : 'Non-Biodegradable'
    });
  });

  return schedule;
}

function getScheduleByArea(area) {
  const schedule = getCollectionSchedule();
  return schedule.filter(s => s.area === area);
}

// ============================================
// Utility Functions
// ============================================
function generateId() {
  return 'CMP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alert-container');

  if (!alertContainer) {
    console.warn('Alert container not found');
    return;
  }

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;

  alertContainer.appendChild(alert);

  setTimeout(() => {
    alert.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return false;

  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
  let isValid = true;

  inputs.forEach(input => {
    const errorElement = input.parentElement.querySelector('.form-error');

    if (!input.value.trim()) {
      isValid = false;
      input.style.borderColor = 'var(--color-danger)';

      if (errorElement) {
        errorElement.textContent = 'This field is required';
      }
    } else {
      input.style.borderColor = '';
      if (errorElement) {
        errorElement.textContent = '';
      }
    }
  });

  return isValid;
}

function clearForm(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.reset();

    // Clear any error messages
    const errors = form.querySelectorAll('.form-error');
    errors.forEach(error => error.textContent = '');

    // Reset input borders
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => input.style.borderColor = '');
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================
// Image Handling
// ============================================
function handleImageUpload(inputElement, callback) {
  if (inputElement.files && inputElement.files[0]) {
    const reader = new FileReader();

    reader.onload = function (e) {
      if (callback) {
        callback(e.target.result);
      }
    };

    reader.readAsDataURL(inputElement.files[0]);
  }
}

// ============================================
// Initialize Sample Data (for demo purposes)
// ============================================
function initializeSampleData() {
  const complaints = getAllComplaints();

  // Only add sample data if no complaints exist
  if (complaints.length === 0) {
    const sampleComplaints = [
      {
        location: 'Downtown',
        wasteType: WASTE_TYPES.NON_BIODEGRADABLE,
        description: 'Overflowing garbage bins near Central Park',
        photo: null
      },
      {
        location: 'North District',
        wasteType: WASTE_TYPES.BIODEGRADABLE,
        description: 'Uncollected organic waste on Main Street',
        photo: null
      },
      {
        location: 'South District',
        wasteType: WASTE_TYPES.RECYCLABLE,
        description: 'Plastic bottles scattered in residential area',
        photo: null
      },
      {
        location: 'East District',
        wasteType: WASTE_TYPES.HAZARDOUS,
        description: 'Electronic waste dumped near school',
        photo: null
      },
      {
        location: 'West District',
        wasteType: WASTE_TYPES.NON_BIODEGRADABLE,
        description: 'Illegal dumping site discovered',
        photo: null
      }
    ];

    sampleComplaints.forEach(complaint => {
      saveComplaint(complaint);
    });

    // Update some statuses for variety
    const allComplaints = getAllComplaints();
    if (allComplaints.length >= 3) {
      updateComplaintStatus(allComplaints[0].id, COMPLAINT_STATUS.IN_PROGRESS);
      updateComplaintStatus(allComplaints[1].id, COMPLAINT_STATUS.RESOLVED);
    }
  }
}

// ============================================
// User Profile & Activity Functions
// ============================================
function getUserComplaints(username) {
  const allComplaints = getAllComplaints();
  return allComplaints.filter(c => c.submittedBy === username);
}

function getUserProfile(username) {
  // Check active session first
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.username === username) {
    return currentUser;
  }

  // Check stored users
  const users = JSON.parse(localStorage.getItem('ecowaste_users') || '[]');
  return users.find(u => u.username === username);
}

function updateUserProfile(username, profileData) {
  const users = JSON.parse(localStorage.getItem('ecowaste_users') || '[]');
  const index = users.findIndex(u => u.username === username);

  if (index !== -1) {
    users[index] = { ...users[index], ...profileData };
    localStorage.setItem('ecowaste_users', JSON.stringify(users));

    // Update current user if it matches
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.username === username) {
      const updatedUser = { ...currentUser, ...profileData };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    }
    return true;
  }
  return false;
}

// ============================================
// Gamification Functions
// ============================================
function AWARD_POINTS(username, points, reason) {
  const profile = getUserProfile(username);
  if (!profile) return false;

  const currentPoints = profile.points || 0;
  const newPoints = currentPoints + points;

  // Award points
  updateUserProfile(username, { points: newPoints });

  return true;
}

function getLeaderboard() {
  const users = JSON.parse(localStorage.getItem('ecowaste_users') || '[]');

  // Filter only residents and sort by points
  const leaderboard = users
    .filter(u => u.type === 'resident')
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 5); // Top 5

  return leaderboard;
}

function getLevel(points) {
  if (!points) return { level: 1, title: 'Eco Beginner', nextLevel: 100 };

  if (points >= 1000) return { level: 5, title: 'Eco Guardian', nextLevel: 2000 };
  if (points >= 500) return { level: 4, title: 'Eco Warrior', nextLevel: 1000 };
  if (points >= 250) return { level: 3, title: 'Eco Activist', nextLevel: 500 };
  if (points >= 100) return { level: 2, title: 'Eco Friendly', nextLevel: 250 };

  return { level: 1, title: 'Eco Beginner', nextLevel: 100 };
}

// ============================================
// Export functions for use in other files
// ============================================
// Note: In a real application, you would use ES6 modules
// For this prototype, functions are globally available
