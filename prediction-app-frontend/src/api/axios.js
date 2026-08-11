import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Sign the user out only when their session itself is no longer valid — the
// server marks those responses with code "token_invalid". A 401 from getting
// your current password wrong on the account page must stay an ordinary form
// error, not an unexpected logout.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const sessionExpired =
      error.response?.status === 401 &&
      error.response?.data?.code === "token_invalid";

    if (sessionExpired) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login?expired=true";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
