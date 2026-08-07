window.NexCRM = window.NexCRM || {};

(function () {
  const SK = 'ncm_session';

  const Auth = {
    login(email, password) {
      const user = NexCRM.Store.Users.getByEmail(email);
      if (!user)        return { error: 'No account found with this email.' };
      if (!user.active) return { error: 'This account has been deactivated.' };
      if (user.password !== password) return { error: 'Incorrect password.' };
      localStorage.setItem(SK, JSON.stringify({ userId: user.id, loginAt: new Date().toISOString() }));
      return { user };
    },
    logout() { localStorage.removeItem(SK); window.location.href = 'index.html'; },
    getSession() { try { return JSON.parse(localStorage.getItem(SK)); } catch { return null; } },
    getUser() { const s = this.getSession(); return s ? NexCRM.Store.Users.get(s.userId) : null; },
    requireAuth() { const u = this.getUser(); if (!u) { window.location.href = 'index.html'; return null; } return u; },
    isAdmin()   { const u = this.getUser(); return u && u.role === 'admin'; },
    isManager() { const u = this.getUser(); return u && (u.role === 'admin' || u.role === 'manager'); },
  };

  window.NexCRM.Auth = Auth;
})();
