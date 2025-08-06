import axios from "axios";

// Create an axios instance with the base URL
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
});


const getToken = async (): Promise<string | null> => {
  const token = window.localStorage.getItem("token");
  return token;
};

// Add a request interceptor to dynamically add the token
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Retrieve the token from Secure Store
      const token = await getToken();
      // If a token exists, attach it to the Authorization header
      config.headers["Content-Type"] = "application/json";
      if (token) {
        config.headers.Authorization = `${token}`;
      }
    } catch (error) {
      console.error("Error retrieving token:", error);
    }

    return config;
  },
  (error) => {
    // Handle errors before the request is sent
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle responses globally
axiosInstance.interceptors.response.use(
  (response) => {
    // Pass through successful responses
    const fullURL = `${import.meta.env.VITE_BASE_URL}${response.config.url}`;

    // Log only on dev
    if (import.meta.env.DEV) {
      console.log(fullURL, response.data);
    }

    // Check for errors in the response body
    if (response.data.error || !response.data.success) {
      // If there's an error in the response body, reject the promise
      return Promise.reject(new Error(response.data.error || "Request failed"));
    }

    return response;
  },
  (error) => {
    console.log(error.response.data);
    // Handle errors globally`
    if (error.response && error.response.status === 403) {
      // Remove the token if unauthorized
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
