/**
 * API Client for BizzHub Voice Calling Agent Dashboard
 * Integrates with BizzHub JWT authentication ('authToken' & 'user' in localStorage)
 */

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && window.location.port === "3000"
    ? "/api"
    : "http://localhost:3000/api");

export const getAuthToken = () => {
  try {
    return localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
};

export const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      // Session expired or unauthorized - clean token and notify
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized", { detail: { path } }));
      }
    }

    if (!response.ok) {
      const errorMsg =
        data?.message ||
        data?.userFriendlyMessage ||
        data?.error ||
        `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`API Error on [${config.method || "GET"}] ${url}:`, error);
    throw error;
  }
}

export const api = {
  getAuthToken,
  getStoredUser,

  /**
   * User Authentication Login
   */
  async login({ email, password }) {
    const res = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res?.token) {
      localStorage.setItem("authToken", res.token);
      if (res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:login", { detail: res }));
      }
    }

    return res;
  },

  /**
   * User Logout
   */
  logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:logout"));
    }
  },

  /**
   * Fetch authenticated user profile
   */
  async getMe() {
    const res = await request("/auth/me");
    return res?.user || res;
  },

  /**
   * Fetch paginated and filtered call records
   */
  async getCalls(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page);
    if (params.limit) query.append("limit", params.limit);
    if (params.search) query.append("search", params.search);
    if (params.status && params.status !== "all") query.append("status", params.status);
    if (params.sentiment && params.sentiment !== "all") query.append("sentiment", params.sentiment);
    if (params.assigned_to && params.assigned_to !== "all") query.append("assigned_to", params.assigned_to);

    const queryString = query.toString();
    const endpoint = `/calls${queryString ? `?${queryString}` : ""}`;
    const res = await request(endpoint);
    if (Array.isArray(res)) return { calls: res, totalPages: 1, totalRecords: res.length, currentPage: 1 };
    if (res?.data?.calls) return res.data;
    if (res?.calls) return res;
    return { calls: [], totalPages: 1, totalRecords: 0, currentPage: 1 };
  },

  /**
   * Fetch single call details by callId
   */
  async getCallById(id) {
    const res = await request(`/calls/${encodeURIComponent(id)}`);
    return res?.data || res;
  },

  /**
   * Fetch overview summary metrics / statistics
   */
  async getStats() {
    const res = await request("/stats");
    return res?.data || res;
  },

  /**
   * Fetch list of active sales representatives
   */
  async getSalesReps() {
    const res = await request("/sales-reps");
    const reps = res?.data?.salesReps || res?.salesReps || [];
    return reps;
  },

  /**
   * Assign a call to a sales representative
   */
  async assignCall(id, { assigned_to_id, assigned_to_name, assigned_to_email }) {
    const res = await request(`/calls/${encodeURIComponent(id)}/assign`, {
      method: "PATCH",
      body: JSON.stringify({
        assigned_to_id,
        assigned_to_name,
        assigned_to_email,
      }),
    });
    return res?.data || res;
  },

  /**
   * Update call details (Pencil edit action)
   */
  async updateCall(id, updateData) {
    const res = await request(`/calls/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
    return res?.data || res;
  },

  /**
   * Fetch lead timeline activities
   */
  async getLeadActivities(leadId) {
    if (!leadId) return [];
    try {
      const res = await request(`/leads/${encodeURIComponent(leadId)}/activities`);
      return Array.isArray(res) ? res : res?.data || [];
    } catch {
      return [];
    }
  },
};

export default api;
