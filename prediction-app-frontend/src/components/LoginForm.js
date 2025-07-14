// In handleSubmit (adjust fields/endpoint if needed)
async function handleSubmit(e) {
  e.preventDefault();
  try {
    const res = await axios.post("/api/auth/login", { username, password });
    localStorage.setItem("token", res.data.token); // Key line: Save token
    window.location.href = "/fixtures"; // Redirect after
  } catch (err) {
    console.error("Login error:", err);
  }
}
