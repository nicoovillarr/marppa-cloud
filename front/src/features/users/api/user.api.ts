import { fetcher } from "@/core/api/fetcher";
import { User } from "../model/user.types";

const userApi = {
    me: () => fetcher<User>("/users/me", "GET"),
}

export default userApi;