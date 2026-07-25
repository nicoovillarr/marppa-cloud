import { fetcher } from "@/core/api/fetcher";
import {
  SystemResetAvailabilityDto,
  SystemResetResponseDto,
} from "./system.api.types";

const baseUrl = "/system";

export const systemApi = {
  availability(): Promise<SystemResetAvailabilityDto> {
    return fetcher<SystemResetAvailabilityDto>(`${baseUrl}/reset/availability`);
  },

  reset(hard: boolean): Promise<SystemResetResponseDto> {
    return fetcher<SystemResetResponseDto>(`${baseUrl}/reset`, "POST", { hard });
  },
};
