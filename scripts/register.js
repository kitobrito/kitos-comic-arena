document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const button = document.getElementById('register-button');
  const status = document.getElementById('register-status');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  const setStatus = (message, variant = 'info') => {
    if (!status) return;
    status.textContent = message || '';
    status.dataset.variant = variant;
  };

  if (!form || !button || !usernameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!username || !email || !password || !confirmPassword) {
      setStatus('All fields are required.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('Passwords do not match.', 'error');
      return;
    }

    button.disabled = true;
    setStatus('Creating account...', 'info');

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          email,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setStatus(data.error || 'Account creation failed.', 'error');
        return;
      }

      setStatus('Account created. Redirecting to sign in...', 'success');
      window.location.href = 'selection-login.html';
    } catch (error) {
      setStatus('Unable to reach the server.', 'error');
    } finally {
      button.disabled = false;
    }
  });
});
