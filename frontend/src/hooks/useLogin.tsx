import axiosInstance from "@/utils/axios";
import { useMutation } from "@tanstack/react-query";

interface ILoginPayload {
  email?: string;
  phone?: string;
  password: string;
  platform: "local" | "google";
}

export const loginAPI = async (payload: ILoginPayload) => {
  const response = await axiosInstance.post("/login", payload);
  return response.data;
};

const useLogin = () => {
  const mutate = useMutation({
    mutationKey: ["login"],
    mutationFn: async (payload: ILoginPayload) => loginAPI(payload),
    onSuccess: (data) => {
      window.localStorage.setItem("token", data.token);
    },
  });

  return mutate;
};

export default useLogin;
