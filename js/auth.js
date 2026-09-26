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
    requireAuth() {
      const s = this.getSession();
      if (!s) { window.location.href = 'index.html'; return null; }
      const u = NexCRM.Store.Users.get(s.userId);
      if (!u) {
        // Session points to a user that no longer exists (stale/mismatched data) —
        // clear it here so index.html doesn't just bounce us straight back.
        localStorage.removeItem(SK);
        window.location.href = 'index.html';
        return null;
      }
      return u;
    },
    isAdmin()   { const u = this.getUser(); return u && u.role === 'admin'; },
    isManager() { const u = this.getUser(); return u && (u.role === 'admin' || u.role === 'manager'); },
  };

  window.NexCRM.Auth = Auth;
})();
